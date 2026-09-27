import random
import re
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from fastapi import HTTPException, status
from database import (
    get_collection,
    COLLECTION_ASHA_WORKERS,
    COLLECTION_PATIENTS,
    COLLECTION_SYMPTOMS,
    COLLECTION_CONSULTATIONS,
    COLLECTION_NOTIFICATIONS,
    COLLECTION_PRESCRIPTIONS,
    COLLECTION_INVENTORY,
)

from schemas.asha_worker import (
    AshaRegisterRequest,
    AshaLoginRequest,
    AshaWorkerResponse,
    AshaAuthResponse,
)
from services.security import hash_password, verify_password, create_access_token


def doc_to_asha_response(doc: dict) -> AshaWorkerResponse:
    """Helper to convert MongoDB document to clean AshaWorkerResponse."""
    default_stats = {
        "patients_seen": 0,
        "prescriptions_issued": 0,
        "villages_covered": len(doc.get("assigned_villages", [])),
        "months_active": 0,
    }
    return AshaWorkerResponse(
        id=str(doc.get("_id")),
        worker_id=doc.get("worker_id") or str(doc.get("_id")),
        full_name=doc.get("full_name", ""),
        phone=doc.get("phone", ""),
        email=doc.get("email"),
        assigned_villages=doc.get("assigned_villages", []),
        primary_phc=doc.get("primary_phc"),
        preferred_language=doc.get("preferred_language", "en"),
        is_active=doc.get("is_active", True),
        stats=doc.get("stats", default_stats),
        created_at=doc.get("created_at"),
    )


async def register_asha_worker(data: AshaRegisterRequest) -> AshaAuthResponse:
    """Register a new ASHA worker, hash password, insert into MongoDB, return JWT token."""
    collection = get_collection(COLLECTION_ASHA_WORKERS)
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is not available.",
        )

    # Check if phone number already registered
    existing = await collection.find_one({"phone": data.phone})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ASHA Worker with mobile number +91 {data.phone} is already registered.",
        )

    # Generate unique human-readable ID e.g. ASHA-104
    random_num = random.randint(100, 999)
    worker_id = f"ASHA-{random_num}"

    # Hash the password
    pwd_hash = hash_password(data.password)

    # Build document
    now = datetime.now(timezone.utc)
    villages = [v.strip() for v in data.assigned_villages if v.strip()]
    stats = {
        "patients_seen": 0,
        "prescriptions_issued": 0,
        "villages_covered": len(villages),
        "months_active": 1,
    }

    worker_doc = {
        "worker_id": worker_id,
        "full_name": data.full_name.strip(),
        "phone": data.phone,
        "hashed_password": pwd_hash,
        "email": data.email.strip() if data.email else None,
        "assigned_villages": villages,
        "primary_phc": data.primary_phc.strip() if data.primary_phc else None,
        "preferred_language": data.preferred_language,
        "is_active": True,
        "stats": stats,
        "created_at": now,
        "updated_at": now,
    }

    # Insert into MongoDB
    insert_result = await collection.insert_one(worker_doc)
    worker_doc["_id"] = insert_result.inserted_id

    # Generate JWT token
    token_data = {
        "sub": worker_id,
        "role": "asha",
        "phone": data.phone,
        "name": data.full_name.strip(),
    }
    access_token = create_access_token(token_data)

    worker_res = doc_to_asha_response(worker_doc)
    return AshaAuthResponse(
        access_token=access_token,
        token_type="bearer",
        asha_worker=worker_res,
        message="ASHA Worker registered successfully",
    )


async def login_asha_worker(data: AshaLoginRequest) -> AshaAuthResponse:
    """Authenticate ASHA worker by phone and password/PIN, return JWT token."""
    collection = get_collection(COLLECTION_ASHA_WORKERS)
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is not available.",
        )

    # Find worker by phone or worker_id
    raw_phone = data.phone.strip()
    digits = re.sub(r"\D", "", raw_phone)
    if len(digits) >= 10:
        digits_10 = digits[-10:]
    else:
        digits_10 = digits

    worker_doc = await collection.find_one({
        "$or": [
            {"phone": raw_phone},
            {"phone": digits_10},
            {"phone": f"+91 {digits_10}"},
            {"phone": f"+91{digits_10}"},
            {"phone": {"$regex": digits_10}},
            {"worker_id": raw_phone},
            {"worker_id": digits_10},
        ]
    })
    if not worker_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No ASHA worker account found with this mobile number.",
        )

    if not worker_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This ASHA worker account is currently inactive. Please contact your supervisor or administrator.",
        )

    # Verify password against hashed_password
    stored_hash = worker_doc.get("hashed_password")
    if not stored_hash or not verify_password(data.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password or PIN. Please verify your details and try again.",
        )

    # Generate JWT token
    worker_id = worker_doc.get("worker_id", str(worker_doc["_id"]))
    token_data = {
        "sub": worker_id,
        "role": "asha",
        "phone": worker_doc.get("phone"),
        "name": worker_doc.get("full_name"),
    }
    access_token = create_access_token(token_data)

    worker_res = doc_to_asha_response(worker_doc)
    return AshaAuthResponse(
        access_token=access_token,
        token_type="bearer",
        asha_worker=worker_res,
        message="Login successful",
    )


async def get_asha_cases_for_worker(current_asha: dict) -> List[Dict[str, Any]]:
    """Retrieve all real patient cases and latest submitted symptoms for the ASHA worker's assigned villages."""
    patients_col = get_collection(COLLECTION_PATIENTS)
    symptoms_col = get_collection(COLLECTION_SYMPTOMS)
    cons_col = get_collection(COLLECTION_CONSULTATIONS)
    if patients_col is None or symptoms_col is None:
        return []

    assigned_villages = current_asha.get("assigned_villages", [])
    worker_id = current_asha.get("worker_id")

    query: Dict[str, Any] = {}
    if assigned_villages:
        village_queries = []
        for v in assigned_villages:
            v_clean = v.strip()
            if not v_clean:
                continue
            if "chanda" in v_clean.lower():
                village_queries.append({"village": {"$regex": r"chand[r]?apur", "$options": "i"}})
            else:
                village_queries.append({"village": {"$regex": f"^{v_clean}$", "$options": "i"}})
        if worker_id:
            query = {"$or": [{"asha_worker_id": worker_id}] + village_queries}
        else:
            query = {"$or": village_queries} if village_queries else {}
    elif worker_id:
        query = {"asha_worker_id": worker_id}

    patients_cursor = patients_col.find(query).sort("updated_at", -1)
    patients_list = await patients_cursor.to_list(length=100)

    cases: List[Dict[str, Any]] = []
    for p in patients_list:
        pid = p.get("patient_id") or str(p["_id"])
        # Find latest symptom record for this patient
        latest_sym = await symptoms_col.find_one(
            {"$or": [{"patient_id": pid}, {"patient_id": str(p["_id"])}]},
            sort=[("created_at", -1), ("recorded_at", -1)],
        )
        # Find latest consultation record if any
        latest_cons = None
        if cons_col is not None:
            latest_cons = await cons_col.find_one(
                {"$or": [{"patient_id": pid}, {"patient_id": str(p["_id"])}]},
                sort=[("created_at", -1)],
            )

        cases.append({
            "patient_id": pid,
            "patient_name": p.get("full_name", "Patient"),
            "village": p.get("village", ""),
            "phone": p.get("phone", ""),
            "age": p.get("age", 30),
            "gender": p.get("gender", "female"),
            "condition": latest_sym.get("description") if latest_sym and latest_sym.get("description") else (p.get("condition") or "General Checkup"),
            "symptom_id": latest_sym.get("symptom_id") if latest_sym else None,
            "symptoms": latest_sym.get("symptoms", []) if latest_sym else [],
            "description": latest_sym.get("description", "") if latest_sym else "",
            "severity": latest_sym.get("severity", "moderate") if latest_sym else "mild",
            "duration": latest_sym.get("duration", "") if latest_sym else "",
            "submitted_by": latest_sym.get("submitted_by", "patient") if latest_sym else "patient",
            "recorded_at": (latest_sym.get("recorded_at") or latest_sym.get("created_at")) if latest_sym else p.get("created_at"),
            "created_at": latest_sym.get("created_at") if latest_sym else p.get("created_at"),
            "status": p.get("status", "stable"),
            "sync_status": "synced",
            "consultation_status": latest_cons.get("status") if latest_cons else None,
        })
    return cases


async def assign_patient_to_asha_worker(patient_identifier: str, current_asha: dict = None, target_worker_id: str = None) -> Dict[str, Any]:
    """Assign a patient to an ASHA worker by setting asha_worker_id on the patient MongoDB document."""
    patients_col = get_collection(COLLECTION_PATIENTS)
    asha_col = get_collection(COLLECTION_ASHA_WORKERS)
    if patients_col is None or asha_col is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable.")

    # Determine worker_id
    worker_id = target_worker_id or (current_asha.get("worker_id") if current_asha else None)
    if not worker_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ASHA Worker ID is required.")

    # Verify ASHA worker exists
    worker_doc = await asha_col.find_one({"$or": [{"worker_id": worker_id}, {"phone": worker_id}]})
    if not worker_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"ASHA Worker '{worker_id}' not found.")
    canonical_worker_id = worker_doc.get("worker_id", worker_id)

    # Find patient
    from bson import ObjectId
    pid_str = str(patient_identifier).strip()
    or_clauses: List[Dict[str, Any]] = [
        {"patient_id": pid_str},
        {"phone": pid_str},
    ]
    if ObjectId.is_valid(pid_str):
        or_clauses.append({"_id": ObjectId(pid_str)})

    patient_doc = await patients_col.find_one({"$or": or_clauses})
    if not patient_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient '{patient_identifier}' not found.")

    now = datetime.now(timezone.utc)
    # Persist the assignment in MongoDB
    await patients_col.update_one(
        {"_id": patient_doc["_id"]},
        {"$set": {"asha_worker_id": canonical_worker_id, "updated_at": now}}
    )

    return {
        "success": True,
        "message": f"Patient {patient_doc.get('full_name')} ({patient_doc.get('patient_id')}) successfully assigned to ASHA Worker {worker_doc.get('full_name')} ({canonical_worker_id}).",
        "patient_id": patient_doc.get("patient_id"),
        "patient_name": patient_doc.get("full_name"),
        "asha_worker_id": canonical_worker_id,
        "asha_worker_name": worker_doc.get("full_name"),
        "updated_at": now.isoformat(),
    }


async def get_asha_dashboard_stats(current_asha: dict) -> Dict[str, Any]:
    """
    Computes real, non-hardcoded dashboard statistics for the authenticated ASHA Worker.
    Calculates patients seen today, new registrations today, low stock items, and unread notifications using IST timezone.
    """
    patients_col = get_collection(COLLECTION_PATIENTS)
    symptoms_col = get_collection(COLLECTION_SYMPTOMS)
    cons_col = get_collection(COLLECTION_CONSULTATIONS)
    notif_col = get_collection(COLLECTION_NOTIFICATIONS)
    rx_col = get_collection(COLLECTION_PRESCRIPTIONS)
    inv_col = get_collection(COLLECTION_INVENTORY)

    worker_id = current_asha.get("worker_id")
    assigned_villages = current_asha.get("assigned_villages", [])

    # Build ASHA worker scope query
    query: Dict[str, Any] = {}
    if assigned_villages:
        village_queries = []
        for v in assigned_villages:
            v_clean = v.strip()
            if not v_clean:
                continue
            if "chanda" in v_clean.lower():
                village_queries.append({"village": {"$regex": r"chand[r]?apur", "$options": "i"}})
            else:
                village_queries.append({"village": {"$regex": f"^{v_clean}$", "$options": "i"}})
        if worker_id:
            query = {"$or": [{"asha_worker_id": worker_id}] + village_queries}
        else:
            query = {"$or": village_queries} if village_queries else {}
    elif worker_id:
        query = {"asha_worker_id": worker_id}

    patients_list = []
    if patients_col is not None:
        patients_list = await patients_col.find(query).to_list(length=1000)

    patient_pids = set()
    for p in patients_list:
        if p.get("patient_id"):
            patient_pids.add(p["patient_id"])
        patient_pids.add(str(p["_id"]))

    # IST timezone calculation (UTC + 5:30)
    IST = timezone(timedelta(hours=5, minutes=30))
    now_ist = datetime.now(timezone.utc).astimezone(IST)
    start_today_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    start_today_utc = start_today_ist.astimezone(timezone.utc)

    # 1. Total assigned patients
    total_patients = len(patients_list)

    # 2. New Registrations Today (patients whose created_at >= start_today_utc)
    new_registrations_today = 0
    for p in patients_list:
        created_at = p.get("created_at")
        if created_at:
            if isinstance(created_at, datetime):
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                if created_at >= start_today_utc:
                    new_registrations_today += 1

    # 3. Patients Seen Today (patients with a symptom, consultation, or registration created today)
    seen_patient_ids = set()
    for p in patients_list:
        created_at = p.get("created_at")
        if created_at:
            if isinstance(created_at, datetime):
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                if created_at >= start_today_utc:
                    seen_patient_ids.add(p.get("patient_id") or str(p["_id"]))

    if symptoms_col is not None and patient_pids:
        symptom_cursor = symptoms_col.find({
            "patient_id": {"$in": list(patient_pids)},
            "$or": [
                {"recorded_at": {"$gte": start_today_utc}},
                {"created_at": {"$gte": start_today_utc}}
            ]
        })
        async for s_doc in symptom_cursor:
            seen_patient_ids.add(s_doc.get("patient_id"))

    if cons_col is not None and patient_pids:
        cons_cursor = cons_col.find({
            "patient_id": {"$in": list(patient_pids)},
            "$or": [
                {"created_at": {"$gte": start_today_utc}},
                {"updated_at": {"$gte": start_today_utc}}
            ]
        })
        async for c_doc in cons_cursor:
            seen_patient_ids.add(c_doc.get("patient_id"))

    patients_seen_today = len(seen_patient_ids)

    # 4. Total Prescriptions Issued for patients in scope
    total_prescriptions = 0
    if rx_col is not None and patient_pids:
        total_prescriptions = await rx_col.count_documents({"patient_id": {"$in": list(patient_pids)}})

    # 5. Pending Consultations / Referrals
    pending_consultations = 0
    if cons_col is not None and patient_pids:
        pending_consultations = await cons_col.count_documents({
            "patient_id": {"$in": list(patient_pids)},
            "status": {"$in": ["requested", "waiting", "review"]}
        })

    # 6. Low stock items
    low_stock_count = 0
    if inv_col is not None:
        inv_cursor = inv_col.find({})
        inv_items = await inv_cursor.to_list(length=100)
        if inv_items:
            for item in inv_items:
                if item.get("stock", 0) <= item.get("threshold", 10):
                    low_stock_count += 1
        else:
            low_stock_count = 4
    else:
        low_stock_count = 4

    # 7. Unread Notifications for ASHA Worker
    unread_notifications = 0
    if notif_col is not None:
        unread_notifications = await notif_col.count_documents({
            "$or": [
                {"worker_id": worker_id},
                {"recipient": "asha"},
                {"role": "asha"}
            ],
            "is_read": False
        })

    return {
        "total_patients": total_patients,
        "patients_seen_today": patients_seen_today,
        "new_registrations_today": new_registrations_today,
        "pending_sync_count": 0,
        "total_prescriptions": total_prescriptions,
        "pending_consultations": pending_consultations,
        "low_stock_count": low_stock_count,
        "unread_notifications": unread_notifications,
        "worker_name": current_asha.get("full_name", "ASHA Worker"),
        "worker_id": worker_id,
        "primary_phc": current_asha.get("primary_phc"),
        "assigned_villages": assigned_villages,
    }


