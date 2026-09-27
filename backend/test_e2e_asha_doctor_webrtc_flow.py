import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from database import connect_to_mongo, get_collection, COLLECTION_PATIENTS, COLLECTION_ASHA_WORKERS, COLLECTION_DOCTORS, COLLECTION_CONSULTATIONS
from services.security import hash_password

@pytest.mark.asyncio
async def test_complete_asha_doctor_webrtc_flow():
    await connect_to_mongo()
    
    # 1. Setup seed accounts in MongoDB
    asha_col = get_collection(COLLECTION_ASHA_WORKERS)
    doc_col = get_collection(COLLECTION_DOCTORS)
    pat_col = get_collection(COLLECTION_PATIENTS)
    cons_col = get_collection(COLLECTION_CONSULTATIONS)

    asha_pwd_hash = hash_password("123456")
    doc_pwd_hash = hash_password("DoctorSecurePass123")

    await asha_col.update_one(
        {"phone": "9837373773"},
        {"$set": {
            "worker_id": "ASHA-833",
            "full_name": "Swati Deshmukh",
            "phone": "9837373773",
            "hashed_password": asha_pwd_hash,
            "assigned_villages": ["Chandapur", "Nandgaon"],
            "is_active": True,
        }},
        upsert=True,
    )

    await doc_col.update_one(
        {"phone": "9823000001"},
        {"$set": {
            "doctor_id": "DOC-101",
            "full_name": "Dr. Ramesh Gupta",
            "phone": "9823000001",
            "hashed_password": doc_pwd_hash,
            "is_on_duty": True,
        }},
        upsert=True,
    )

    await pat_col.update_one(
        {"patient_id": "P-4559"},
        {"$set": {
            "patient_id": "P-4559",
            "full_name": "Ramesh Kumar",
            "village": "Chandapur",
            "asha_worker_id": "ASHA-833",
            "condition": "Fever & Cough",
            "status": "waiting",
        }},
        upsert=True,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step A: ASHA Login
        asha_login_res = await client.post("/api/asha/login", json={"phone": "9837373773", "password": "123456"})
        assert asha_login_res.status_code == 200, f"ASHA login failed: {asha_login_res.json()}"
        asha_token = asha_login_res.json()["access_token"]
        asha_headers = {"Authorization": f"Bearer {asha_token}"}
        print("[OK] ASHA logged in successfully")

        # Step B & C & D: ASHA starts video consultation for Ramesh Kumar (P-4559)
        request_res = await client.post(
            "/api/consultations/request",
            json={
                "patient_id": "P-4559",
                "reason": "High fever follow-up & teleconsultation request",
                "urgency": "urgent",
            },
            headers=asha_headers,
        )
        assert request_res.status_code == 201, f"Consultation request failed: {request_res.json()}"
        cons_data = request_res.json()
        consultation_id = cons_data["consultation_id"]
        room_id = cons_data["call_session"]["room_id"]
        assert cons_data["status"] == "requested"
        assert cons_data["patient_id"] == "P-4559"
        assert cons_data["patient_name"] == "Ramesh Kumar"
        print(f"[OK] Consultation request created in MongoDB: ID={consultation_id}, Room={room_id}, Status={cons_data['status']}")

        # Verify duplicate prevention: repeated click returns existing active consultation
        dup_request_res = await client.post(
            "/api/consultations/request",
            json={
                "patient_id": "P-4559",
                "reason": "Duplicate click attempt",
                "urgency": "urgent",
            },
            headers=asha_headers,
        )
        assert dup_request_res.status_code == 201
        assert dup_request_res.json()["consultation_id"] == consultation_id
        print("[OK] Duplicate request prevention verified: returned existing consultation ID")

        # Step E: Doctor Login (Dr. Ramesh Gupta, DOC-101)
        doc_login_res = await client.post("/api/doctor/login", json={"phone": "9823000001", "password": "DoctorSecurePass123"})
        assert doc_login_res.status_code == 200, f"Doctor login failed: {doc_login_res.json()}"
        doc_token = doc_login_res.json()["access_token"]
        doc_headers = {"Authorization": f"Bearer {doc_token}"}
        print("[OK] Doctor logged in successfully as Dr. Ramesh Gupta (DOC-101)")

        # Step F: Doctor fetches video requests
        v_requests_res = await client.get("/api/doctor/video-requests", headers=doc_headers)
        assert v_requests_res.status_code == 200
        v_requests = v_requests_res.json()
        target_req = next((r for r in v_requests if r["consultation_id"] == consultation_id), None)
        assert target_req is not None, f"Created consultation {consultation_id} not found in doctor video-requests: {v_requests}"
        print(f"[OK] Verified consultation request {consultation_id} appears in Doctor Dashboard Queue")

        # Step G & H: Doctor accepts request
        decision_res = await client.post(
            f"/api/consultations/{consultation_id}/decision",
            json={"action": "accept", "notes": "Accepting teleconsultation for Ramesh Kumar"},
            headers=doc_headers,
        )
        assert decision_res.status_code == 200, f"Accept failed: {decision_res.json()}"
        accepted_data = decision_res.json()
        assert accepted_data["status"] == "accepted"
        assert accepted_data["doctor_id"] == "DOC-101"
        assert accepted_data["doctor_name"] == "Dr. Ramesh Gupta"
        print(f"[OK] Doctor accepted consultation: Status={accepted_data['status']}, Doctor={accepted_data['doctor_name']}")

        # Step I: Both sides verify SAME consultation_id and room_id
        assert accepted_data["consultation_id"] == consultation_id
        assert accepted_data["call_session"]["room_id"] == room_id
        print(f"[OK] Both ASHA and Doctor share identical Session ID: {room_id}")

        # Step M: End consultation call
        end_call_res = await client.post(f"/api/consultations/{consultation_id}/end-call", headers=doc_headers)
        assert end_call_res.status_code == 200
        assert end_call_res.json()["status"] == "completed"
        print("[OK] Consultation call completed successfully and marked in MongoDB")

if __name__ == "__main__":
    asyncio.run(test_complete_asha_doctor_webrtc_flow())
