import { useEffect, useRef, useState } from "react"
import {
  endConsultationCall,
  getAuthUser,
  getAuthToken,
  API_BASE_URL,
  updateConsultationStatus,
} from "../lib/api.js"
import { ashaT } from "../lib/ashaI18n.js"
import { WebRTCManager } from "../lib/webrtc.js"

function BackIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}
function MicIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}
function MicOffIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}
function CameraIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}
function CameraOffIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 1.4-.6" />
      <path d="m9.5 4 1-1h3l2.5 3h4a2 2 0 0 1 2 2v6.6" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}
function PhoneOffIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="22" y1="2" x2="2" y2="22" />
    </svg>
  )
}
function VolumeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}
function VolumeXIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  )
}
function CheckCircleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
function UserIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function StethoscopeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.8 2.3A2 2 0 0 0 3 4v6a5 5 0 0 0 10 0V4" />
      <path d="M8 15v1a6 6 0 0 0 12 0v-3" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  )
}
function AlertTriangleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export default function AshaVideoCallScreen({
  patient,
  consultation,
  lang = "en",
  onBack,
  onCompleteConsultation,
}) {
  const t = ashaT(lang)
  const authUser = getAuthUser()

  const patientName = patient?.full_name || patient?.name || consultation?.patient_name || "Patient"
  const patientId = patient?.patient_id || patient?.id || consultation?.patient_id || "P-1001"
  const doctorName = consultation?.doctor_name || "Dr. Rajesh Sharma (On Duty Specialist)"
  const sessionId = consultation?.call_session?.room_id || consultation?.consultation_id || `room_${patientId}`

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const webrtcManagerRef = useRef(null)
  const websocketRef = useRef(null)

  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false)
  const [connectionState, setConnectionState] = useState("connecting") // "connecting" | "connected" | "ended"
  const [permissionError, setPermissionError] = useState(null)
  const [doctorConnected, setDoctorConnected] = useState(false)
  const [consultationNotes, setConsultationNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false)

  // Call duration timer
  useEffect(() => {
    if (connectionState === "ended") return
    const timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [connectionState])

  // WebRTC and WebSocket signaling initialization
  useEffect(() => {
    let isMounted = true

    async function initAshaVideoSession() {
      try {
        const token = getAuthToken()
        const webrtc = new WebRTCManager({
          onLocalStream: (stream) => {
            if (localVideoRef.current && isMounted) {
              localVideoRef.current.srcObject = stream
            }
          },
          onRemoteStream: (remoteStream) => {
            if (remoteVideoRef.current && isMounted) {
              remoteVideoRef.current.srcObject = remoteStream
              setDoctorConnected(true)
              setConnectionState("connected")
            }
          },
          onIceCandidate: (candidate) => {
            if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
              websocketRef.current.send(
                JSON.stringify({
                  type: "ice-candidate",
                  candidate: candidate,
                })
              )
            }
          },
          onConnectionStateChange: (state) => {
            if (isMounted) {
              if (state === "connected") {
                setConnectionState("connected")
              } else if (state === "disconnected" || state === "failed") {
                setConnectionState("disconnected")
              }
            }
          },
          onError: () => {
            if (isMounted) {
              setPermissionError("Camera/Microphone permission denied or hardware unavailable.")
            }
          },
        })

        webrtcManagerRef.current = webrtc
        const localStream = await webrtc.getLocalMedia({ video: true, audio: true }).catch(() => null)

        let wsHost = window.location.host
        let wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"

        if (API_BASE_URL && /^https?:\/\//i.test(API_BASE_URL)) {
          try {
            const urlObj = new URL(API_BASE_URL)
            wsHost = urlObj.host
            wsProtocol = urlObj.protocol === "https:" ? "wss:" : "ws:"
          } catch {}
        }

        const wsUrl = `${wsProtocol}//${wsHost}/api/ws/teleconsultation/${sessionId}?token=${encodeURIComponent(token || "")}`
        const ws = new WebSocket(wsUrl)
        websocketRef.current = ws

        ws.onopen = async () => {
          console.log("[ASHA WebRTC WS] Connected to session:", sessionId)
          // Initiate SDP offer if local stream ready
          if (webrtcManagerRef.current && localStream) {
            try {
              const offer = await webrtcManagerRef.current.createOffer()
              ws.send(JSON.stringify({ type: "offer", sdp: offer }))
            } catch (err) {
              console.warn("[ASHA WebRTC] Offer creation error:", err)
            }
          }
        }

        ws.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === "peer-joined") {
              setDoctorConnected(true)
              if (webrtcManagerRef.current) {
                const offer = await webrtcManagerRef.current.createOffer()
                ws.send(JSON.stringify({ type: "offer", sdp: offer }))
              }
            } else if (msg.type === "offer") {
              if (webrtcManagerRef.current) {
                const answer = await webrtcManagerRef.current.createAnswer(msg.sdp)
                ws.send(JSON.stringify({ type: "answer", sdp: answer }))
              }
            } else if (msg.type === "answer") {
              if (webrtcManagerRef.current) {
                await webrtcManagerRef.current.handleAnswer(msg.sdp)
              }
            } else if (msg.type === "ice-candidate" && msg.candidate) {
              if (webrtcManagerRef.current) {
                await webrtcManagerRef.current.addIceCandidate(msg.candidate)
              }
            } else if (msg.type === "call-ended" || msg.type === "peer-left") {
              handleEndCall()
            }
          } catch (e) {
            console.warn("[ASHA WebRTC WS] Message parse error:", e)
          }
        }
      } catch (err) {
        console.error("ASHA Video session error:", err)
        if (isMounted) {
          setPermissionError("Could not access camera or microphone. Please check permissions.")
        }
      }
    }

    initAshaVideoSession()

    return () => {
      isMounted = false
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.cleanup()
        webrtcManagerRef.current = null
      }
      if (websocketRef.current) {
        try {
          websocketRef.current.close()
        } catch {}
      }
    }
  }, [sessionId])

  const handleToggleMute = () => {
    if (webrtcManagerRef.current) {
      const active = webrtcManagerRef.current.toggleAudio()
      setIsMuted(!active)
    }
  }

  const handleToggleCamera = () => {
    if (webrtcManagerRef.current) {
      const active = webrtcManagerRef.current.toggleVideo()
      setIsCameraOff(!active)
    }
  }

  const handleToggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !isSpeakerMuted
      setIsSpeakerMuted(!isSpeakerMuted)
    }
  }

  const handleEndCall = async () => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      try {
        websocketRef.current.send(JSON.stringify({ type: "call-ended" }))
        websocketRef.current.close()
      } catch {}
    }

    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.cleanup()
      webrtcManagerRef.current = null
    }

    if (consultation?.consultation_id) {
      try {
        await endConsultationCall(consultation.consultation_id)
      } catch {}
    }

    setConnectionState("ended")
  }

  const handleSaveNotes = async () => {
    if (!consultationNotes.trim()) return
    setSavingNotes(true)
    setNotesSavedSuccess(false)
    try {
      if (consultation?.consultation_id) {
        await updateConsultationStatus(consultation.consultation_id, "in_consultation", consultationNotes)
      }
      setNotesSavedSuccess(true)
      setTimeout(() => setNotesSavedSuccess(false), 3000)
    } catch (err) {
      console.error("Error saving consultation notes:", err)
    } finally {
      setSavingNotes(false)
    }
  }

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <main className="min-h-dvh w-full bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleEndCall}
            aria-label={t.common.goBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white active:scale-95"
          >
            <BackIcon className="h-5 w-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-sm font-bold text-white">{patientName}</h1>
              <span className="font-mono text-xs text-blue-400">({patientId})</span>
            </div>
            <p className="text-xs text-slate-400">
              {doctorName} &middot; Teleconsultation Room
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 font-mono text-xs font-bold text-emerald-400">
            {formatTimer(callDuration)}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
            connectionState === "connected" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
            connectionState === "ended" ? "bg-slate-800 text-slate-400" : "bg-amber-950 text-amber-400 border border-amber-800"
          }`}>
            {connectionState === "connected" ? "Connected" : connectionState === "ended" ? "Ended" : "Connecting..."}
          </span>
        </div>
      </header>

      {/* Main Content Layout (Video + Right Side Clinical Panel) */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Left / Center Video Stream Box */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[380px] lg:min-h-0 overflow-hidden">
          {/* Remote Video (Doctor Stream) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />

          {/* Doctor Connecting Overlay */}
          {!doctorConnected && connectionState !== "ended" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 p-6 text-center z-10 backdrop-blur-sm">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-4 animate-pulse">
                <StethoscopeIcon className="h-10 w-10" />
              </div>
              <p className="text-lg font-bold text-white">Connecting with Doctor...</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Establishing encrypted WebRTC audio & video channel with the assigned specialist doctor.
              </p>
            </div>
          )}

          {/* Permission or Media Error State */}
          {permissionError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 p-6 z-20">
              <div className="max-w-md rounded-3xl border border-red-500/40 bg-red-950/80 p-6 text-center text-red-200">
                <AlertTriangleIcon className="h-10 w-10 mx-auto text-red-400 mb-3" />
                <p className="text-base font-bold text-white mb-1">Camera / Microphone Notice</p>
                <p className="text-xs text-red-300">{permissionError}</p>
                <p className="mt-3 text-[11px] text-slate-400">
                  Audio & consultation notes remain active. You can continue speaking with the doctor or re-check browser permissions.
                </p>
              </div>
            </div>
          )}

          {/* Floating Picture-in-Picture Local Video (Patient/ASHA Stream) */}
          <div className="absolute bottom-20 right-4 z-20 h-44 w-32 overflow-hidden rounded-2xl border-2 border-white/30 shadow-2xl bg-slate-900">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${isCameraOff ? "hidden" : "block"}`}
            />
            {isCameraOff && (
              <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-400 text-xs text-center p-2">
                Camera Off
              </div>
            )}
            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
              Patient / ASHA
            </span>
          </div>

          {/* Bottom Toolbar Controls Overlay */}
          <div className="absolute bottom-4 inset-x-4 flex items-center justify-center gap-4 z-20">
            <div className="flex items-center gap-3 rounded-full bg-slate-900/90 border border-slate-700/80 p-2 shadow-2xl backdrop-blur-md">
              {/* Mic Toggle */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                  isMuted ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-slate-800 text-white hover:bg-slate-700"
                }`}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <MicOffIcon className="h-5 w-5" /> : <MicIcon className="h-5 w-5" />}
              </button>

              {/* End Call Button */}
              <button
                type="button"
                onClick={handleEndCall}
                className="flex h-13 w-13 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 hover:bg-red-700 transition active:scale-95"
                title="End Video Consultation"
              >
                <PhoneOffIcon className="h-6 w-6" />
              </button>

              {/* Camera Toggle */}
              <button
                type="button"
                onClick={handleToggleCamera}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                  isCameraOff ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-slate-800 text-white hover:bg-slate-700"
                }`}
                title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {isCameraOff ? <CameraOffIcon className="h-5 w-5" /> : <CameraIcon className="h-5 w-5" />}
              </button>

              {/* Speaker Toggle */}
              <button
                type="button"
                onClick={handleToggleSpeaker}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                  isSpeakerMuted ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-slate-800 text-white hover:bg-slate-700"
                }`}
                title={isSpeakerMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {isSpeakerMuted ? <VolumeXIcon className="h-5 w-5" /> : <VolumeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Clinical Panel & Consultation Notes */}
        <aside className="w-full lg:w-96 shrink-0 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 overflow-y-auto flex flex-col gap-4 text-xs">
          {/* Patient Overview Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Patient Details</span>
              <span className="text-[10px] font-mono text-slate-400">{patientId}</span>
            </div>
            <p className="text-sm font-bold text-white">{patientName}</p>
            <p className="text-slate-400 mt-0.5">
              {[patient?.age != null ? `${patient.age} yrs` : null, patient?.gender, patient?.village].filter(Boolean).join(" · ") || "Village Patient"}
            </p>
            {patient?.phone && <p className="text-slate-500 text-[11px] mt-1">Phone: {patient.phone}</p>}
          </div>

          {/* Current Symptoms Summary */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1.5">Symptoms & Complaint</p>
            <p className="text-slate-200 font-medium leading-relaxed">
              {patient?.condition || consultation?.reason || patient?.recentSymptoms?.[0]?.description || "General teleconsultation request."}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 font-medium">
                Blood Group: <strong className="text-white">{patient?.bloodGroup || patient?.blood_group || "Not provided"}</strong>
              </span>
              {patient?.allergies?.length > 0 && (
                <span className="rounded-lg bg-red-950 border border-red-800 px-2.5 py-1 text-[11px] text-red-300">
                  Allergies: {patient.allergies.join(", ")}
                </span>
              )}
            </div>
          </div>

          {/* Consultation Notes Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-col gap-2 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Live Consultation Notes</p>
            <textarea
              value={consultationNotes}
              onChange={(e) => setConsultationNotes(e.target.value)}
              placeholder="Record doctor's instructions, clinical notes, or prescribed advice during call…"
              className="w-full flex-1 min-h-[100px] rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <div className="flex items-center justify-between mt-1">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={savingNotes || !consultationNotes.trim()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 transition active:scale-95"
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>
              {notesSavedSuccess && (
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircleIcon className="h-3.5 w-3.5" /> Notes Saved
                </span>
              )}
            </div>
          </div>

          {/* Complete Consultation CTA */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                handleEndCall()
                onCompleteConsultation?.(patient)
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition active:scale-98"
            >
              <CheckCircleIcon className="h-4 w-4" />
              <span>Complete Consultation</span>
            </button>
          </div>
        </aside>
      </div>
    </main>
  )
}
