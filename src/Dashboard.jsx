import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, database } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue, query, orderByChild, equalTo, update, push, set } from 'firebase/database';
import { 
  FaBell, FaSignOutAlt, FaUser, FaRegCalendarAlt, 
  FaStethoscope, FaHeartbeat, FaRegListAlt, FaHeart, FaMapMarkerAlt, 
  FaChevronRight, FaTimesCircle, FaCheckCircle, FaExclamationTriangle, 
  FaChartLine, FaTimes, FaArrowLeft, FaCamera, FaIdBadge, 
  FaStar, FaHistory, FaClock, FaBullhorn, FaThermometerHalf, FaTint,
  FaRobot, FaPaperPlane, FaIdCard, FaSms
} from 'react-icons/fa';
import BookingModal from './BookingModal';
import Records from './Records';
import AvailableTimes from './AvailableTimes';
import { decryptData } from './encryption';

function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [currentServing, setCurrentServing] = useState("None");
  const [showBooking, setShowBooking] = useState(false);
  const [myTicket, setMyTicket] = useState("None");
  const [assignedTime, setAssignedTime] = useState(null); 
  const [activeApptId, setActiveApptId] = useState(null);
  const [activeApptObj, setActiveApptObj] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [myAppointments, setMyAppointments] = useState([]); 
  const [allTodayAppointments, setAllTodayAppointments] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [myNotifications, setMyNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUploading, setIsUploading] = useState(false); 
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  
  const [showCallPopup, setShowCallPopup] = useState(false);
  const [showNearTurnPopup, setShowNearTurnPopup] = useState(false);
  const [nearTurnDismissed, setNearTurnDismissed] = useState(false);

  const [feedbackAppt, setFeedbackAppt] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [systemSettings, setSystemSettings] = useState({ status: 'Open', closedReason: '' });
  const [alertBox, setAlertBox] = useState({ show: false, message: '', type: 'info' });
  const [confirmBox, setConfirmBox] = useState({ show: false, message: '', onConfirm: null });

  const [passportEdit, setPassportEdit] = useState({ allergies: '', immunizations: '', medicalHistory: '' });
  const [isEditingPassport, setIsEditingPassport] = useState(false);

  // "KA-HEALTH" 24/7 CONVERSATIONAL AI ASSISTANT STATES
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am "Ka-Health", your 24/7 AI Health Assistant for Barangay Old Cabalan Health Center.\n\nYou can ask me in English or Tagalog about:\n• Symptoms & Vital Signs Check\n• Clinic Operating Hours & Immunization Days\n• Medicine Availability & Schedules\n• Step-by-Step Booking Guide',
      urgency: null
    }
  ]);
  
  const navigate = useNavigate();
  const showAlert = (message, type = 'info') => setAlertBox({ show: true, message, type });
  const showConfirm = (message, onConfirm) => setConfirmBox({ show: true, message, onConfirm });

  const getLocalDate = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() - offset);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        onValue(ref(database, 'users/' + user.uid), (snapshot) => {
          const val = snapshot.val() || {};
          setUserData({ id: user.uid, ...val });
          setPassportEdit({
            allergies: val.healthPassport?.allergies || 'None reported',
            immunizations: val.healthPassport?.immunizations || 'Standard Barangay Immunization',
            medicalHistory: val.healthPassport?.medicalHistory || 'None reported'
          });
        });
        onValue(ref(database, 'liveQueue/current'), (snapshot) => { if (snapshot.exists()) setCurrentServing(snapshot.val()); });
        onValue(ref(database, 'settings'), (snapshot) => { if (snapshot.exists()) setSystemSettings(snapshot.val()); });
        
        onValue(ref(database, 'appointments'), (snapshot) => {
          if (snapshot.exists()) {
            const allList = Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] }));
            const todayStr = getLocalDate();
            setAllTodayAppointments(allList.filter(a => a.appointmentDate === todayStr && a.status === 'pending' && !a.isSkipped));
          } else {
            setAllTodayAppointments([]);
          }
        });

        onValue(ref(database, 'inventory'), (snapshot) => {
          if (snapshot.exists()) {
            setInventoryList(Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })));
          } else {
            setInventoryList([]);
          }
        });

        const appointmentsRef = query(ref(database, 'appointments'), orderByChild('patientId'), equalTo(user.uid));
        onValue(appointmentsRef, (snapshot) => {
          if (snapshot.exists()) {
            const list = Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })).reverse();
            setMyAppointments(list);
            const pendingList = list.filter(app => app.status === 'pending');
            if (pendingList.length > 0) {
              setMyTicket(pendingList[0].queueNumber);
              setAssignedTime(pendingList[0].assignedTime || null);
              setActiveApptId(pendingList[0].id);
              setActiveApptObj(pendingList[0]);
            } else { 
              setMyTicket("None"); 
              setAssignedTime(null); 
              setActiveApptId(null); 
              setActiveApptObj(null);
            }
          } else { 
            setMyAppointments([]); 
            setMyTicket("None"); 
            setAssignedTime(null); 
            setActiveApptId(null); 
            setActiveApptObj(null);
          }
        });

        onValue(ref(database, `notifications/${user.uid}`), (snapshot) => {
          if (snapshot.exists()) setMyNotifications(Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })).reverse());
          else setMyNotifications([]);
        });
      } else navigate('/');
    });
    return () => unsubscribe();
  }, [navigate]);

  // AI-FORECASTED WAIT TIME & QUEUE POSITION TRACKER
  const computeQueueForecast = () => {
    if (myTicket === "None" || !activeApptObj) {
      return { patientsAhead: 0, estWaitMins: 0, paceLabel: 'No active ticket' };
    }
    if (currentServing === myTicket) {
      return { patientsAhead: 0, estWaitMins: 0, paceLabel: 'Now being served' };
    }

    const parseNum = (str) => {
      if (!str || str === "None") return 0;
      const match = str.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    const myNum = parseNum(myTicket);
    const currentNum = parseNum(currentServing);

    let aheadCount = 0;
    if (currentNum > 0 && myNum > currentNum) {
      aheadCount = myNum - currentNum;
    } else {
      const sortedToday = [...allTodayAppointments].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      const idx = sortedToday.findIndex(a => a.queueNumber === myTicket);
      aheadCount = idx >= 0 ? idx : Math.max(1, myNum - 1);
    }

    const basePace = activeApptObj.estDurationMins || 10;
    const priorityFactor = myTicket.startsWith('P-') ? 0.8 : 1.0;
    const estWaitMins = Math.max(3, Math.round(aheadCount * basePace * priorityFactor));

    return {
      patientsAhead: aheadCount,
      estWaitMins,
      paceLabel: aheadCount <= 2 ? 'Almost your turn — please prepare' : 'Estimated based on live consultation pace'
    };
  };

  const queueForecast = computeQueueForecast();

  useEffect(() => {
    if (myTicket !== "None" && currentServing === myTicket) {
      setShowCallPopup(true);
      setShowNearTurnPopup(false);
    } else if (myTicket !== "None" && currentServing !== "None" && queueForecast.patientsAhead > 0 && queueForecast.patientsAhead <= 2 && !nearTurnDismissed) {
      setShowNearTurnPopup(true);
    }
  }, [currentServing, myTicket, queueForecast.patientsAhead, nearTurnDismissed]);

  useEffect(() => {
    if (myAppointments.length > 0) {
      const unrated = myAppointments.find(app => app.status === 'completed' && !app.feedbackSubmitted);
      if (unrated && !feedbackAppt) setFeedbackAppt(unrated);
    }
  }, [myAppointments, feedbackAppt]);

  const analyzeBP = (bpStr) => {
    if(!bpStr) return null;
    const [sys, dia] = bpStr.split('/').map(Number);
    if(!sys || !dia) return { label: "Invalid Format", color: "#94a3b8" };
    if(sys < 90 && dia < 60) return { label: "Low Blood", color: "#3b82f6" };
    if(sys <= 120 && dia <= 80) return { label: "Normal", color: "#16a34a" };
    if(sys <= 129 && dia < 80) return { label: "Elevated", color: "#f59e0b" };
    return { label: "High Blood", color: "#ef4444" };
  };

  const computeBMI = (weight, heightCm) => {
    if(!weight || !heightCm) return null;
    const heightM = heightCm / 100;
    const bmi = (weight / (heightM * heightM)).toFixed(1);
    if(bmi < 18.5) return { val: bmi, label: "Underweight", color: "#3b82f6" };
    if(bmi < 24.9) return { val: bmi, label: "Normal", color: "#16a34a" };
    if(bmi < 29.9) return { val: bmi, label: "Overweight", color: "#f59e0b" };
    return { val: bmi, label: "Obese", color: "#ef4444" };
  };

  const bpStatus = userData?.healthMetrics?.bp ? analyzeBP(userData.healthMetrics.bp) : null;
  const bmiStatus = computeBMI(userData?.healthMetrics?.weight, userData?.healthMetrics?.height);

  const detectLanguage = (inputStr) => {
    const text = inputStr.toLowerCase();
    const tagalogRegex = /\b(ako|ko|akin|ang|ng|sa|mga|may|meron|wala|walang|masakit|sumasakit|nahihilo|hilo|lagnat|nilalagnat|ubo|inuubo|sipon|sinisipon|giniginaw|tiyan|ulo|dibdib|huminga|hirap|pantal|bulutong|tigdas|nakakahawa|nakagat|aso|pusa|kalmot|payat|bata|anak|gana|kumain|ayaw|buntis|bakuna|sanggol|nagtatae|suka|nasusuka|sugat|batok|katawan|suriin|ano|paano|kailan|bakit|saan|naman|po|ba|kasi|parang|sobrang|mataas|mababa|kumusta|tulong|gamot|lalamunan|plema|uhaw|ihi|kabag|oras|bukas|dokumento|kailangan|magbook|kansela)\b/i;
    const englishRegex = /\b(i|im|i'm|my|me|have|has|had|am|is|are|was|were|feel|feeling|pain|ache|headache|stomach|stomachache|fever|chills|cough|coughing|cold|sore|throat|rash|rashes|shortness|breath|breathing|chest|dizzy|dizziness|bitten|bite|dog|cat|scratch|child|children|underweight|malnourished|malnutrition|pregnant|pregnancy|prenatal|maternal|vaccine|vaccination|immunization|diarrhea|vomit|vomiting|nausea|wound|cut|injury|analyze|check|what|how|when|why|where|the|and|with|for|from|high|low|blood|pressure|sugar|doctor|please|help|need|can|cannot|cant|today|hours|schedule|medicine|stock|available|documents|requirements|book|cancel)\b/i;
    const hasTagalog = tagalogRegex.test(text);
    const hasEnglish = englishRegex.test(text);
    return (hasTagalog && !hasEnglish) ? 'tl' : 'en';
  };

  const analyzeSymptomsWithAI = (inputStr) => {
    const text = inputStr.toLowerCase();
    const isTL = detectLanguage(inputStr) === 'tl';
    const metrics = userData?.healthMetrics || {};
    const temp = parseFloat(metrics.temp);
    const oxygen = parseFloat(metrics.oxygen);
    const decryptedCondition = metrics.conditions ? decryptData(metrics.conditions) : "";
    
    let urgency = "";
    let urgencyColor = "#16a34a";
    let assessment = "";
    let recommendation = "";

    if (text.includes("operating hours") || text.includes("schedule") || text.includes("immunization day") || text.includes("documents") || text.includes("requirements") || text.includes("oras") || text.includes("kailan") || text.includes("dokumento")) {
      return {
        sender: 'bot',
        text: isTL
          ? `🏥 Iskedyul ng Brgy. Old Cabalan Health Center:\n\n• Operating Hours: Lunes - Biyernes (8:00 AM – 5:00 PM)\n• General Consultation: Araw-araw (8:00 AM – 4:00 PM)\n• Maternal & Prenatal Care: Lunes, Miyerkules, Biyernes (8:00 AM – 12:00 PM)\n• Bakuna / Immunization: Miyerkules at Biyernes (8:00 AM – 3:00 PM)\n• Senior & Maintenance Meds: Araw-araw\n• Dental Services: Martes at Huwebes (8:00 AM – 12:00 PM)\n\n📋 Kailangang Dalhin: Barangay ID, PhilHealth ID, Senior/PWD ID, o Baby Book.`
          : `🏥 Brgy. Old Cabalan Health Center Schedules & Requirements:\n\n• Operating Hours: Monday – Friday (8:00 AM – 5:00 PM)\n• General Consultation: Daily (8:00 AM – 4:00 PM)\n• Maternal & Prenatal Care: Mon, Wed, Fri (8:00 AM – 12:00 PM)\n• Immunization / Vaccination: Wednesday & Friday (8:00 AM – 3:00 PM)\n• Senior & Maintenance Medicine Pickup: Daily\n• Dental Services: Tuesday & Thursday (8:00 AM – 12:00 PM)\n\n📋 Required Documents: Barangay ID, PhilHealth ID, Senior/PWD ID, or Baby Book.`,
        urgency: "CLINIC SCHEDULE & REQUIREMENTS",
        urgencyColor: "#0bc25c",
        suggestBook: true
      };
    }

    if (text.includes("medicine") || text.includes("stock") || text.includes("available") || text.includes("gamot") || text.includes("paracetamol") || text.includes("losartan") || text.includes("vitamins")) {
      const inStockMeds = inventoryList.filter(i => i.stock > 0);
      const medSummary = inStockMeds.length > 0
        ? inStockMeds.map(i => `• ${i.itemName} (${i.category}): ${i.stock} units available`).join('\n')
        : (isTL ? '• Kasalukuyang ina-update ang listahan ng gamot sa center.' : '• Medicine stock list is currently being updated by staff.');

      return {
        sender: 'bot',
        text: isTL
          ? `💊 Available na Gamot at Bakuna sa Health Center:\n\n${medSummary}\n\n📅 Maaaring kumuha ng gamot Lunes hanggang Biyernes (8:00 AM - 4:00 PM). Mag-book lamang ng appointment at dalhin ang iyong reseta o ID.`
          : `💊 Available Medicines & Supplies at the Health Center:\n\n${medSummary}\n\n📅 Distribution is open Monday to Friday (8:00 AM - 4:00 PM). Simply book an appointment and bring your prescription or ID.`,
        urgency: "MEDICINE AVAILABILITY",
        urgencyColor: "#3b82f6",
        suggestBook: true
      };
    }

    if (text.includes("how to book") || text.includes("cancel") || text.includes("step") || text.includes("paano magbook") || text.includes("kansela")) {
      return {
        sender: 'bot',
        text: isTL
          ? `📖 Paano Mag-book o Mag-cancel ng Appointment:\n\n1. Pag-book: Pindutin ang "Book Appointment" button.\n2. Piliin ang Serbisyo, Petsa, Oras, at Category, tapos pindutin ang Confirm.\n3. Pag-cancel: Sa iyong Dashboard sa ilalim ng Live Queue Status, pindutin ang pulang "Cancel My Ticket" button.`
          : `📖 How to Book or Cancel an Appointment:\n\n1. To Book: Click the "Book Appointment" button.\n2. Select your required Service, Date, Time, and Category, then click Confirm.\n3. To Cancel: On your Dashboard under Live Queue Status, click the red "Cancel My Ticket" button.`,
        urgency: "BOOKING GUIDE",
        urgencyColor: "#a855f7",
        suggestBook: true
      };
    }

    if (text.includes("vitals") || text.includes("analyze") || text.includes("health status") || text.includes("suriin") || text.includes("status ko")) {
      const noRec = isTL ? 'Wala pang record' : 'No record yet';
      const vitalsSummary = [
        `• Blood Pressure: ${metrics.bp || noRec} ${bpStatus ? `(${bpStatus.label})` : ''}`,
        `• Heart Rate: ${metrics.hr ? `${metrics.hr} bpm` : noRec}`,
        `• Body Temperature: ${metrics.temp ? `${metrics.temp} °C` : noRec}`,
        `• Blood Oxygen (SpO2): ${metrics.oxygen ? `${metrics.oxygen}%` : noRec}`,
        `• BMI: ${bmiStatus ? `${bmiStatus.val} (${bmiStatus.label})` : noRec}`,
        decryptedCondition ? `• Alert: ${decryptedCondition}` : null
      ].filter(Boolean).join('\n');

      if ((oxygen && oxygen < 94) || (temp && temp >= 38.0) || (bpStatus && bpStatus.label === "High Blood")) {
        urgency = isTL ? "MODERATE TO HIGH (May Abnormal sa Vitals)" : "MODERATE TO HIGH (Abnormal Vitals Alert)";
        urgencyColor = "#ef4444";
        recommendation = isTL 
          ? "May nakitang abnormal reading sa iyong Vital Signs. Magpakonsulta agad sa ating Doktor."
          : "Abnormal readings were detected in your latest vital signs. Please schedule a consultation with our Doctor.";
      } else {
        urgency = isTL ? "NORMAL / MAAYOS NA VITALS" : "NORMAL / STABLE VITALS";
        urgencyColor = "#16a34a";
        recommendation = isTL
          ? "Maayos ang iyong kasalukuyang Vital Signs! Ipagpatuloy ang healthy lifestyle."
          : "Your recorded vital signs are within stable parameters. Continue maintaining a healthy lifestyle.";
      }

      return {
        sender: 'bot',
        text: isTL
          ? `📊 Pagsusuri ng iyong Vital Signs:\n\n${vitalsSummary}\n\n💡 Rekomendasyon: ${recommendation}`
          : `📊 Clinical Vitals Analysis:\n\n${vitalsSummary}\n\n💡 Recommendation: ${recommendation}`,
        urgency,
        urgencyColor,
        suggestBook: true
      };
    }

    if (text.includes("shortness of breath") || text.includes("difficulty breathing") || text.includes("can't breathe") || text.includes("chest pain") || text.includes("hirap huminga") || text.includes("masakit ang dibdib") || (oxygen && oxygen < 94)) {
      urgency = isTL ? "HIGH / KRITIKAL (Agarang Atensyong Medikal)" : "HIGH / CRITICAL (Immediate Medical Attention)";
      urgencyColor = "#ef4444";
      assessment = isTL
        ? "Nakitaan ng posibleng respiratory o cardiac distress base sa iyong sintomas."
        : "Potential respiratory or cardiac distress detected based on your symptoms.";
      recommendation = isTL
        ? "Pumunta agad sa Old Cabalan Health Center o sa pinakamalapit na ospital."
        : "Please proceed immediately to the Old Cabalan Health Center or the nearest Emergency Room.";
    } 
    else if (text.includes("bite") || text.includes("bitten") || text.includes("dog") || text.includes("cat") || text.includes("scratch") || text.includes("rabies") || text.includes("kagat") || text.includes("nakagat") || text.includes("aso") || text.includes("pusa") || text.includes("kalmot")) {
      urgency = isTL ? "HIGH / AGARAN (Animal Bite Protocol)" : "HIGH / URGENT (Animal Bite Protocol)";
      urgencyColor = "#ef4444";
      assessment = isTL ? "Posibleng Rabies exposure mula sa kagat o kalmot ng hayop." : "Potential Rabies exposure from an animal bite or scratch.";
      recommendation = isTL
        ? "Hugasan agad ang sugat gamit ang sabon at tubig sa loob ng 10-15 minuto at pumunta sa Health Center."
        : "Wash the wound immediately with soap and water for 10-15 minutes and visit the Health Center.";
    }
    else if (text.includes("rash") || text.includes("rashes") || text.includes("chickenpox") || text.includes("measles") || text.includes("contagious") || text.includes("pantal") || text.includes("bulutong") || text.includes("tigdas") || text.includes("nakakahawa")) {
      urgency = isTL ? "MODERATE-HIGH (Pag-iingat sa Nakakahawang Sakit)" : "MODERATE-HIGH (Contagious Precaution)";
      urgencyColor = "#ef4444";
      assessment = isTL
        ? "Sintomas na maaaring konektado sa nakakahawang sakit sa balat o viral infection."
        : "Symptoms indicate a potentially contagious skin or viral infection.";
      recommendation = isTL
        ? "Magsuot ng face mask bago pumunta sa Health Center at ipagbigay-alam agad sa staff."
        : "Please wear a face mask before visiting the clinic and inform the staff upon arrival.";
    }
    else if (text.includes("fever") || text.includes("chills") || text.includes("dengue") || text.includes("flu") || text.includes("lagnat") || text.includes("nilalagnat") || text.includes("giniginaw") || text.includes("trangkaso") || (temp && temp >= 37.8)) {
      urgency = "MODERATE (Priority Fever Consultation)";
      urgencyColor = "#f59e0b";
      assessment = isTL ? "May indikasyon ng lagnat o viral infection." : "Indicators of fever or viral infection.";
      recommendation = isTL
        ? "Uminom ng maraming tubig, magpahinga, at mag-book ng appointment upang masuri ng Doktor."
        : "Stay hydrated, rest, and book a consultation today.";
    }
    else if (text.includes("cough") || text.includes("cold") || text.includes("sore throat") || text.includes("phlegm") || text.includes("tb") || text.includes("asthma") || text.includes("ubo") || text.includes("inuubo") || text.includes("sipon") || text.includes("lalamunan") || text.includes("hika")) {
      urgency = "MODERATE (Respiratory Precaution)";
      urgencyColor = "#f59e0b";
      assessment = isTL ? "Posibleng Upper Respiratory Tract Infection (ubo/sipon) o Asthma." : "Possible Upper Respiratory Tract Infection (cough/cold) or Asthma.";
      recommendation = isTL
        ? "Magsuot ng face mask kapag pupunta sa Health Center at uminom ng maligamgam na tubig."
        : "Please wear a face mask when visiting the Health Center and drink warm fluids.";
    }
    else if (text.includes("dizzy") || text.includes("dizziness") || text.includes("high blood") || text.includes("hypertension") || text.includes("bp") || text.includes("hilo") || text.includes("nahihilo") || text.includes("batok") || (bpStatus && bpStatus.label === "High Blood")) {
      urgency = "MODERATE (Blood Pressure Monitoring)";
      urgencyColor = "#f59e0b";
      assessment = isTL ? "Sintomas na maaaring konektado sa Blood Pressure." : "Symptoms may be associated with elevated Blood Pressure.";
      recommendation = isTL
        ? "Umupo muna at magpahinga. Iwasan ang maaalat na pagkain at magpa-check ng BP sa Health Center."
        : "Sit down and rest. Avoid high-sodium foods and book a consultation for BP monitoring.";
    }
    else if (text.includes("malnourished") || text.includes("malnutrition") || text.includes("underweight") || text.includes("nutrition") || text.includes("payat") || text.includes("timbang") || text.includes("walang gana") || (bmiStatus && bmiStatus.label === "Underweight")) {
      urgency = "MODERATE (Nutrition Program)";
      urgencyColor = "#3b82f6";
      assessment = isTL ? "Pangangailangan sa Nutritional & Weight Assessment." : "Requirement for Nutritional & Weight Assessment.";
      recommendation = isTL
        ? "Mag-book ng appointment upang masuri ng Doktor para sa libreng vitamins at nutrition program."
        : "Book an appointment so our Doctor can evaluate the patient for free vitamins and nutrition support.";
    }
    else {
      urgency = "LOW (Routine Consultation)";
      urgencyColor = "#16a34a";
      assessment = isTL
        ? "Natanggap ko ang iyong mensahe. Maaari akong tumulong sa pagsusuri ng sintomas, oras ng clinic, o available na gamot."
        : "Thank you for reaching out! I can help you with symptom checks, clinic schedules, or medicine availability.";
      recommendation = isTL
        ? "Mag-type ng sintomas gaya ng 'lagnat', 'ubo', 'nahihilo', o pindutin ang mga pagpipilian sa itaas."
        : "Try clicking the quick buttons above or type 'fever', 'cough', 'medicine stock', or 'operating hours'.";
    }

    return {
      sender: 'bot',
      text: isTL
        ? `🩺 Ka-Health Pagsusuri: ${assessment}\n\n💡 Rekomendasyon: ${recommendation}`
        : `🩺 Ka-Health Assessment: ${assessment}\n\n💡 Recommendation: ${recommendation}`,
      urgency,
      urgencyColor,
      suggestBook: true
    };
  };

  const handleSendAI = (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    const userMsg = { sender: 'user', text: aiInput };
    const botReply = analyzeSymptomsWithAI(aiInput);
    setAiMessages(prev => [...prev, userMsg, botReply]);
    setAiInput('');
  };

  const handleQuickPrompt = (promptText) => {
    const userMsg = { sender: 'user', text: promptText };
    const botReply = analyzeSymptomsWithAI(promptText);
    setAiMessages(prev => [...prev, userMsg, botReply]);
  };

  const handleSavePassport = () => {
    if (!userData) return;
    update(ref(database, `users/${userData.id}/healthPassport`), {
      allergies: passportEdit.allergies,
      immunizations: passportEdit.immunizations,
      medicalHistory: passportEdit.medicalHistory,
      lastUpdated: new Date().toLocaleDateString()
    }).then(() => {
      setIsEditingPassport(false);
      showAlert("Health Passport updated!", "success");
    });
  };

  const handleLogout = () => signOut(auth).then(() => navigate('/'));

  const handleCancelAppointment = () => {
    if (!cancelReason) return showAlert("Select a reason.", "error");
    const finalReason = cancelReason === 'Others' ? otherReason : cancelReason;
    const targetAppt = myAppointments.find(a => a.id === activeApptId);
    update(ref(database, `appointments/${activeApptId}`), { 
      status: 'cancelled', 
      cancelReason: finalReason,
      adminAcknowledgedCancel: false 
    }).then(() => { 
      if(targetAppt) {
        push(ref(database, `notifications/admin`), {
          title: "Appointment Cancelled",
          message: `Queue ${targetAppt.queueNumber} was cancelled by the patient. Reason: ${finalReason}`,
          date: targetAppt.appointmentDate,
          appId: activeApptId,
          timestamp: new Date().toLocaleString()
        });
      }
      setShowCancelModal(false); 
      showAlert("Appointment cancelled successfully.", "success"); 
    });
  };

  const handleBookClick = () => {
    if (systemSettings.status === 'Closed') return showAlert(`Suspended. Reason: ${systemSettings.closedReason}`, "error");
    if (myTicket === "None") setShowBooking(true);
    else showAlert("Active appointment exists.", "error");
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1048576) return showAlert("Image is too large! Please choose an image smaller than 1MB.", "error");
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        update(ref(database, 'users/' + userData.id), { profilePicture: reader.result })
        .then(() => { showAlert("Profile picture updated!", "success"); setIsUploading(false); })
        .catch(err => { showAlert(err.message, "error"); setIsUploading(false); });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitFeedback = (skipped = false) => {
    if (!skipped && rating === 0) return showAlert("Select star rating.", "error");
    update(ref(database, `appointments/${feedbackAppt.id}`), { feedbackSubmitted: true, rating: skipped ? 0 : rating, feedbackComment: skipped ? "" : feedbackText })
    .then(() => { setFeedbackAppt(null); setRating(0); setFeedbackText(''); if(!skipped) showAlert("Feedback successfully saved!", "success"); });
  };

  const deleteMyNotification = (e, notifId) => {
    e.stopPropagation();
    if (!userData) return;
    set(ref(database, `notifications/${userData.id}/${notifId}`), null);
  };

  return (
    <div className="dash-wrapper">
      {alertBox.show && ( <div className="modal-overlay hide-on-print"><div className="modern-register-card" style={{ maxWidth: '350px', textAlign: 'center', padding: '30px', background: '#ffffff' }}><div style={{ fontSize: '50px', marginBottom: '15px', color: alertBox.type === 'success' ? '#10b981' : '#ef4444' }}>{alertBox.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}</div><h3 style={{ color: '#1e293b', marginBottom: '10px' }}>{alertBox.message}</h3><button onClick={() => setAlertBox({ show: false, message: '', type: 'info' })} className="btn-green-full" style={{ margin: 0 }}>OK</button></div></div> )}
      {confirmBox.show && ( <div className="modal-overlay hide-on-print"><div className="modern-register-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px', background: '#ffffff' }}><div style={{ fontSize: '50px', color: '#ef4444', marginBottom: '15px' }}><FaExclamationTriangle /></div><h3 style={{ color: '#1e293b', marginBottom: '10px' }}>{confirmBox.message}</h3><div style={{ display: 'flex', gap: '10px' }}><button onClick={() => setConfirmBox({ show: false, message: '', onConfirm: null })} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Go Back</button><button onClick={() => { confirmBox.onConfirm(); setConfirmBox({ show: false, message: '', onConfirm: null }); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Yes, Cancel it</button></div></div></div> )}
      
      {/* VIRTUAL WAITING ROOM: "2 NUMBERS AWAY" SMS / PUSH ALERT POPUP */}
      {showNearTurnPopup && (
        <div className="modal-overlay" style={{ zIndex: 9998 }}>
          <div className="modern-register-card" style={{ maxWidth: '430px', textAlign: 'center', padding: '35px', background: '#ffffff', border: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '50px', marginBottom: '10px', color: '#f59e0b' }}><FaSms /></div>
            <span style={{ background: '#fffbeb', color: '#d97706', padding: '4px 12px', borderRadius: '15px', fontSize: '11px', fontWeight: '800', border: '1px solid #fde68a' }}>
              SMS / PUSH QUEUE ALERT
            </span>
            <h2 style={{ color: '#1e293b', margin: '15px 0 8px 0', fontSize: '24px', fontWeight: '900' }}>
              You Are {queueForecast.patientsAhead} {queueForecast.patientsAhead === 1 ? 'Number' : 'Numbers'} Away!
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
              Your Ticket: <strong>{myTicket}</strong> — Currently Serving: <strong>{currentServing}</strong>.<br/>
              Estimated wait time is <strong>~{queueForecast.estWaitMins} mins</strong>. Please proceed to the health center now.
            </p>
            <button onClick={() => { setShowNearTurnPopup(false); setNearTurnDismissed(true); }} className="btn-green-full" style={{ background: '#f59e0b', margin: 0 }}>
              OK, Heading to Center
            </button>
          </div>
        </div>
      )}

      {/* "KA-HEALTH" 24/7 CONVERSATIONAL AI ASSISTANT MODAL */}
      {showAIModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modern-register-card" style={{ maxWidth: '550px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '82vh' }}>
            <div style={{ background: 'linear-gradient(135deg, #0bc25c, #00796b)', padding: '18px 25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'white', color: '#0bc25c', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' }}><FaRobot /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800' }}>"Ka-Health" AI Assistant</h3>
                  <span style={{ fontSize: '11px', opacity: 0.9 }}>24/7 Tagalog/English Health & Schedule Assistant</span>
                </div>
              </div>
              <button onClick={() => setShowAIModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}><FaTimes /></button>
            </div>

            <div style={{ padding: '10px 15px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7', display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
              <button type="button" onClick={() => handleQuickPrompt("Analyze my vitals")} style={{ background: '#0bc25c', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>📊 Analyze My Vitals</button>
              <button type="button" onClick={() => handleQuickPrompt("Check medicine availability")} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', padding: '5px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>💊 Medicine Stock</button>
              <button type="button" onClick={() => handleQuickPrompt("Clinic operating hours and immunization schedule")} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', padding: '5px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>🕒 Schedules & Docs</button>
              <button type="button" onClick={() => handleQuickPrompt("How to book or cancel an appointment")} style={{ background: '#faf5ff', border: '1px solid #e9d5ff', color: '#7e22ce', padding: '5px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>📖 Booking Guide</button>
              <button type="button" onClick={() => handleQuickPrompt("I have a fever and chills")} style={{ background: 'white', border: '1px solid #bbf7d0', color: '#16a34a', padding: '5px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>🌡️ Fever & Chills</button>
              <button type="button" onClick={() => handleQuickPrompt("I have a cough and cold")} style={{ background: 'white', border: '1px solid #bbf7d0', color: '#16a34a', padding: '5px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>😷 Cough & Cold</button>
            </div>

            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {aiMessages.map((msg, index) => (
                <div key={index} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                  <div style={{
                    background: msg.sender === 'user' ? '#0bc25c' : 'white',
                    color: msg.sender === 'user' ? 'white' : '#1e293b',
                    padding: '12px 16px',
                    borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-line'
                  }}>
                    {msg.urgency && (
                      <div style={{ background: `${msg.urgencyColor}15`, color: msg.urgencyColor, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', marginBottom: '8px', display: 'inline-block', border: `1px solid ${msg.urgencyColor}40` }}>
                        {msg.urgency}
                      </div>
                    )}
                    <div>{msg.text}</div>
                    {msg.suggestBook && myTicket === "None" && systemSettings.status !== 'Closed' && (
                      <button 
                        type="button"
                        onClick={() => { setShowAIModal(false); setShowBooking(true); }}
                        style={{ marginTop: '12px', width: '100%', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <FaRegCalendarAlt /> Book Appointment Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendAI} style={{ padding: '15px 20px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                className="modern-input" 
                placeholder="Ask Ka-Health in English or Tagalog..." 
                value={aiInput} 
                onChange={(e) => setAiInput(e.target.value)} 
                style={{ flex: 1 }}
              />
              <button type="submit" style={{ background: '#0bc25c', color: 'white', border: 'none', padding: '0 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaPaperPlane />
              </button>
            </form>
          </div>
        </div>
      )}

      {showCallPopup && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modern-register-card" style={{ maxWidth: '450px', textAlign: 'center', padding: '40px', background: '#ffffff', border: '4px solid #10b981' }}>
            <div style={{ fontSize: '60px', marginBottom: '15px', color: '#10b981', animation: 'pulse 1.5s infinite' }}><FaBullhorn /></div>
            <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '28px', fontWeight: '900' }}>IT'S YOUR TURN!</h1>
            <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Please proceed to the doctor's office immediately.</p>
            <div style={{ fontSize: '50px', fontWeight: '900', color: '#0bc25c', marginBottom: '30px' }}>{myTicket}</div>
            <button onClick={() => setShowCallPopup(false)} className="btn-green-full" style={{ margin: 0, fontSize: '16px', padding: '15px' }}>I'm on my way</button>
          </div>
        </div>
      )}

      {feedbackAppt && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modern-register-card" style={{ maxWidth: '400px', padding: '30px', textAlign: 'center' }}>
            <div style={{ background: '#fffbeb', color: '#f59e0b', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', margin: '0 auto 15px auto' }}><FaStar /></div>
            <h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '22px', fontWeight: '800' }}>Rate Your Experience</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Your appointment for <strong>{feedbackAppt.healthService || feedbackAppt.serviceType}</strong> is complete! How was our service?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>{[1, 2, 3, 4, 5].map(star => <FaStar key={star} size={35} color={(hoverRating || rating) >= star ? '#f59e0b' : '#e2e8f0'} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(star)} style={{ cursor: 'pointer', transition: '0.2s' }} />)}</div>
            <div className="modern-group" style={{ marginBottom: '20px', textAlign: 'left' }}><textarea className="modern-input" placeholder="Comments (Optional)" rows="3" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} style={{ resize: 'none', padding: '15px' }}></textarea></div>
            <div style={{ display: 'flex', gap: '10px' }}><button onClick={() => handleSubmitFeedback(true)} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Skip / Close</button><button onClick={() => handleSubmitFeedback(false)} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', background: '#0bc25c', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Save Rating</button></div>
          </div>
        </div>
      )}

      {showBooking && <BookingModal onClose={() => setShowBooking(false)} userData={userData} />}
      
      {showCancelModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modern-register-card" style={{ maxWidth: '450px', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowCancelModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}><FaTimes /></button>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}><div style={{ background: '#fef2f2', color: '#ef4444', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', margin: '0 auto 15px auto', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)' }}><FaTimesCircle /></div><h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '22px', fontWeight: '800' }}>Cancel Appointment</h2><p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>You are about to cancel Queue Number: <strong style={{color: '#ef4444'}}>{myTicket}</strong></p></div>
            <div className="form-content"><div className="modern-group" style={{ marginBottom: '15px' }}><label style={{ color: '#475569', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>REASON FOR CANCELLATION</label><select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="modern-input" required><option value="" disabled>Select a reason...</option><option value="Wrong details entered">Entered wrong details</option><option value="Conflict of schedule">Unexpected schedule conflict</option><option value="Feeling better">Feeling better / Recovered</option><option value="Others">Others (Please specify)</option></select></div>{cancelReason === 'Others' && (<div className="modern-group" style={{ marginBottom: '15px' }}><input type="text" placeholder="Type your specific reason here..." value={otherReason} onChange={(e) => setOtherReason(e.target.value)} className="modern-input" required /></div>)}<div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}><button onClick={() => setShowCancelModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>Keep Ticket</button><button onClick={handleCancelAppointment} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' }}>Confirm Cancel</button></div></div>
          </div>
        </div>
      )}

      <nav className="dash-nav">
        <div className="dash-nav-left" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
          <div className="dash-logo-box"><img src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" alt="Logo" style={{ width: '28px' }} /></div>
          <div><h2>Old Cabalan Health App</h2><p>Your Health, Our Priority</p></div>
        </div>
        <div className="dash-nav-right">
          <div style={{ position: 'relative' }}>
            <button className="dash-icon-btn" onClick={() => setShowNotifDropdown(!showNotifDropdown)}>
              <FaBell />
              {myNotifications.length > 0 && <span className="dash-badge">{myNotifications.length}</span>}
            </button>

            {/* FIXED ANDROID NOTIFICATION DROPDOWN (CENTERED ON MOBILE, NO LEFT OVERLAP) */}
            {showNotifDropdown && (
              <div style={{ 
                position: 'fixed', 
                top: '75px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                background: 'white', 
                width: '92vw', 
                maxWidth: '350px', 
                borderRadius: '12px', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.25)', 
                border: '1px solid #e2e8f0', 
                zIndex: 9999, 
                overflow: 'hidden',
                textAlign: 'left'
              }}>
                <div style={{ padding: '14px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, color: '#1e293b', fontSize: '14px' }}>Notifications</h4>
                  <span onClick={() => setShowNotifDropdown(false)} style={{ fontSize: '12px', color: '#64748b', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaTimes /> Close
                  </span>
                </div>
                <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  {myNotifications.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '25px 15px', color: '#94a3b8', margin: 0, fontSize: '13px' }}>No new notifications.</p>
                  ) : (
                    myNotifications.map((notif) => (
                      <div key={notif.id} onClick={() => { setShowNotifDropdown(false); setActiveTab('history'); }} style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', position: 'relative' }}>
                        <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '10px', borderRadius: '50%', fontSize: '14px', flexShrink: 0 }}><FaBell /></div>
                        <div style={{ flex: 1, paddingRight: '18px' }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#1e293b' }}>{notif.title}</h4>
                          <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{notif.message}</p>
                          <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>{notif.timestamp}</span>
                        </div>
                        <button 
                          onClick={(e) => deleteMyNotification(e, notif.id)} 
                          title="Remove notification"
                          style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', padding: '2px' }}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="dash-user-pill" onClick={() => setActiveTab('profile')} style={{ cursor: 'pointer' }}><FaUser /> {userData ? userData.fullName.split(' ')[0] : "Resident"}</div>
          <div className="dash-user-pill" onClick={handleLogout} style={{ background: 'transparent', border: 'none', padding: '0', cursor: 'pointer' }}><FaSignOutAlt /></div>
        </div>
      </nav>

      <div className="dash-container">
        {activeTab === 'profile' ? (
           <div className="dash-card" style={{ maxWidth: '850px', margin: '0 auto', padding: '40px' }}>
             <button onClick={() => setActiveTab('dashboard')} style={{ background: 'transparent', border: 'none', fontSize: '15px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '30px', fontWeight: 'bold' }}><FaArrowLeft /> Back to Dashboard</button>
             {userData && (
               <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                 <div style={{ textAlign: 'center', minWidth: '200px', margin: '0 auto' }}>
                   <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 15px auto' }}>
                     {userData.profilePicture ? <img src={userData.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f0fdf4', boxShadow: '0 4px 15px rgba(11, 194, 92, 0.2)' }} /> : <div style={{ background: '#f8fafc', width: '100%', height: '100%', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '50px', color: '#cbd5e1', border: '4px solid white', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}><FaIdBadge /></div>}
                     <label style={{ position: 'absolute', bottom: '5px', right: '5px', background: '#0bc25c', color: 'white', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '3px solid white', transition: '0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                       <FaCamera /><input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePicChange} disabled={isUploading} />
                     </label>
                   </div>
                   <h3 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '20px' }}>{userData.fullName}</h3>
                   <span style={{ background: '#f0fdf4', color: '#0bc25c', padding: '4px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #bbf7d0', display: 'inline-block' }}>
                     {userData.idType || 'Barangay Health ID'}: {userData.idNumber || `OCH-${userData.id.substring(0, 5).toUpperCase()}`}
                   </span>
                   <button onClick={() => setActiveTab('history')} style={{ marginTop: '20px', width: '100%', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display:'flex', justifyContent:'center', alignItems:'center', gap:'8px' }}><FaHistory /> View Medical History</button>
                 </div>
                 <div style={{ flex: 1, minWidth: '280px' }}>
                   {userData?.healthMetrics?.conditions && (
                     <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px' }}>
                       <p style={{ margin: 0, color: '#ef4444', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><FaExclamationTriangle /> HEALTH ALERTS / CONDITIONS</p>
                       <p style={{ margin: '5px 0 0 0', color: '#b91c1c', fontSize: '15px', fontWeight: '600' }}>{decryptData(userData.healthMetrics.conditions)}</p>
                     </div>
                   )}
                   <h3 style={{ color: '#1e293b', fontSize: '18px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '15px' }}>Personal Information</h3>
                   <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#334155' }}><strong>Email:</strong> {userData.email}</p>
                   <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#334155' }}><strong>Contact:</strong> {userData.contact}</p>
                   <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#334155' }}><strong>Purok:</strong> {userData.purok}</p>
                   <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#334155' }}><strong>Address:</strong> {userData.address}</p>

                   <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '18px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                       <h4 style={{ margin: 0, color: '#166534', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}><FaIdCard /> Digital Health Passport</h4>
                       <button onClick={() => setIsEditingPassport(!isEditingPassport)} style={{ background: 'white', border: '1px solid #0bc25c', color: '#0bc25c', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                         {isEditingPassport ? 'Cancel' : 'Edit'}
                       </button>
                     </div>
                     {isEditingPassport ? (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                         <div>
                           <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>ALLERGIES</label>
                           <input type="text" className="modern-input" value={passportEdit.allergies} onChange={(e) => setPassportEdit({...passportEdit, allergies: e.target.value})} style={{ background: 'white', padding: '8px' }} />
                         </div>
                         <div>
                           <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>IMMUNIZATIONS / VACCINES</label>
                           <input type="text" className="modern-input" value={passportEdit.immunizations} onChange={(e) => setPassportEdit({...passportEdit, immunizations: e.target.value})} style={{ background: 'white', padding: '8px' }} />
                         </div>
                         <div>
                           <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>MEDICAL HISTORY</label>
                           <input type="text" className="modern-input" value={passportEdit.medicalHistory} onChange={(e) => setPassportEdit({...passportEdit, medicalHistory: e.target.value})} style={{ background: 'white', padding: '8px' }} />
                         </div>
                         <button onClick={handleSavePassport} className="btn-green-full" style={{ padding: '10px', fontSize: '13px' }}>Save Changes</button>
                       </div>
                     ) : (
                       <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                         <div><strong>Allergies:</strong> {userData.healthPassport?.allergies || 'None reported'}</div>
                         <div><strong>Immunizations:</strong> {userData.healthPassport?.immunizations || 'Standard Barangay Immunization'}</div>
                         <div><strong>Medical History:</strong> {userData.healthPassport?.medicalHistory || 'None reported'}</div>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             )}
           </div>
        ) : activeTab === 'history' ? (
           <Records onBack={() => setActiveTab('dashboard')} userData={userData} appointments={myAppointments} onRate={(app) => {setFeedbackAppt(app); setRating(app.rating || 0); setFeedbackText(app.feedbackComment || '');}} />
        ) : activeTab === 'availableTimes' ? (
           <AvailableTimes onBack={() => setActiveTab('dashboard')} clinicStatus={systemSettings.status} closedReason={systemSettings.closedReason} />
        ) : (
           <>
             {systemSettings.status === 'Closed' && (
               <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '15px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                 <FaExclamationTriangle style={{ fontSize: '24px', color: '#ef4444' }} />
                 <div><h4 style={{ margin: 0, color: '#ef4444', fontSize: '15px' }}>CLINIC IS CURRENTLY CLOSED</h4><p style={{ margin: 0, color: '#b91c1c', fontSize: '13px' }}>{systemSettings.closedReason || 'No appointments are being accepted at this time.'}</p></div>
               </div>
             )}
             <div className="dash-hero">
               <FaStethoscope style={{ position: 'absolute', right: '-20px', top: '10px', fontSize: '150px', opacity: '0.1' }} />
               <h1>Welcome back, {userData ? userData.fullName.split(' ')[0] : "Resident"}! 👋</h1>
               <p>Book your appointment and monitor your live queue status</p>
             </div>
             
             <div className="dash-quick-actions" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
               <div className="dash-action-card" onClick={handleBookClick} style={{ opacity: myTicket !== "None" || systemSettings.status === 'Closed' ? 0.6 : 1, cursor: myTicket !== "None" || systemSettings.status === 'Closed' ? 'not-allowed' : 'pointer' }}>
                 <div className="dash-icon-wrapper" style={{ background: '#10b981' }}><FaRegCalendarAlt /></div><span>Book Appointment</span>
               </div>
               <div className="dash-action-card" onClick={() => setActiveTab('history')}>
                 <div className="dash-icon-wrapper" style={{ background: '#3b82f6' }}><FaHistory /></div><span>View History</span>
               </div>
               <div className="dash-action-card" onClick={() => setActiveTab('availableTimes')}>
                 <div className="dash-icon-wrapper" style={{ background: '#f97316' }}><FaClock /></div><span>Available Slots</span>
               </div>
               <div className="dash-action-card" onClick={() => setShowAIModal(true)} style={{ border: '2px solid #a855f7' }}>
                 <div className="dash-icon-wrapper" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}><FaRobot /></div><span>"Ka-Health" AI Bot</span>
               </div>
             </div>
             
             <div className="dash-grid">
               <div className="dash-left">
                 <div className="dash-card">
                   <div className="dash-card-header">
                     <div className="dash-card-icon"><FaStethoscope /></div>
                     <div>
                       <h3 className="dash-card-title">Live Queue Status</h3>
                       <p className="dash-card-subtitle">Virtual Waiting Room & Mobile Queue Tracker</p>
                     </div>
                   </div>
                   <div className="doctor-avail-box">
                     <div style={{ background: 'white', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 18px', marginBottom: '15px', textAlign: 'center' }}>
                       <span style={{ fontSize: '11px', fontWeight: '800', color: '#00796b', textTransform: 'uppercase' }}>LIVE QUEUE TRACKER</span>
                       <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', marginTop: '4px' }}>
                         Queue {myTicket !== "None" ? `#${myTicket}` : "(None)"} — Currently Serving: <span style={{ color: '#0bc25c' }}>{currentServing !== "None" ? `#${currentServing}` : "None"}</span>
                       </div>
                     </div>

                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                       <div>
                         <h4 style={{ margin: 0, color: '#1e293b', fontSize: '15px', fontWeight: '800' }}>AI-Forecasted Wait Time</h4>
                         <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>{queueForecast.paceLabel}</p>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                         <span style={{ fontSize: '24px', color: '#f59e0b', fontWeight: '900' }}>
                           {myTicket !== "None" ? `~${queueForecast.estWaitMins} mins` : '--'}
                         </span>
                         {myTicket !== "None" && (
                           <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
                             ({queueForecast.patientsAhead} {queueForecast.patientsAhead === 1 ? 'patient' : 'patients'} ahead)
                           </div>
                         )}
                       </div>
                     </div>

                     <hr style={{ border: 'none', borderTop: '1px dashed #bbf7d0', margin: '15px 0' }} />

                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div>
                         <h4 style={{ margin: 0, color: '#1e293b', fontSize: '14px', fontWeight: '800' }}>My Ticket</h4>
                         <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>
                           {assignedTime ? `Schedule: ${assignedTime}` : (activeApptObj?.healthService || 'Pending')}
                         </p>
                       </div>
                       <span style={{ fontSize: '22px', color: '#3b82f6', fontWeight: '900' }}>{myTicket}</span>
                     </div>

                     {myTicket !== "None" && (
                       <button onClick={() => setShowCancelModal(true)} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '18px' }}>
                         <FaTimesCircle style={{ fontSize: '17px' }} /> Cancel My Ticket
                       </button>
                     )}
                   </div>
                 </div>

                 <div className="dash-card">
                   <div className="dash-card-header"><div className="dash-card-icon" style={{ color: '#3b82f6', background: '#eff6ff' }}><FaBell /></div><div><h3 className="dash-card-title">Recent Updates</h3><p className="dash-card-subtitle">Your latest notifications</p></div></div>
                   {myNotifications.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', padding: '20px 0' }}>No new updates available.</p> : myNotifications.slice(0, 3).map((notif) => (<div key={notif.id} className="activity-item"><div className="activity-icon"><FaRegListAlt /></div><div style={{ flex: 1 }}><h4 style={{ margin: 0, color: '#1e293b', fontSize: '14px', fontWeight: '700' }}>{notif.title}</h4><p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>{notif.message}</p><span style={{ fontSize: '11px', color: '#94a3b8' }}>{notif.timestamp}</span></div><FaChevronRight style={{ color: '#cbd5e1' }} /></div>))}
                 </div>
               </div>
               
               <div className="dash-right">
                 <div className="dash-card">
                   <div className="dash-card-header"><div className="dash-card-icon" style={{ color: '#ef4444', background: '#fef2f2' }}><FaHeart /></div><div><h3 className="dash-card-title">Health Metrics</h3><p className="dash-card-subtitle">Latest readings</p></div></div>
                   <div className="metric-row"><div className="metric-info"><FaUser style={{ color: '#f59e0b', fontSize: '18px' }} /><div><h4>Height / Weight</h4><h2>{userData?.healthMetrics?.height ? `${userData.healthMetrics.height} cm` : '--'} / {userData?.healthMetrics?.weight ? `${userData.healthMetrics.weight} kg` : '--'}</h2></div></div></div>
                   <div className="metric-row"><div className="metric-info"><FaHeart style={{ color: '#10b981', fontSize: '18px' }} /><div><h4>Blood Pressure</h4><h2>{userData?.healthMetrics?.bp || 'TBA'}</h2></div></div>{bpStatus ? <span style={{ background: '#f1f5f9', color: bpStatus.color, padding: '4px 10px', borderRadius: '15px', fontSize: '10px', fontWeight: 'bold' }}>{bpStatus.label}</span> : <span className="metric-badge">PENDING</span>}</div>
                   <div className="metric-row"><div className="metric-info"><FaHeartbeat style={{ color: '#3b82f6', fontSize: '18px' }} /><div><h4>Heart Rate</h4><h2>{userData?.healthMetrics?.hr ? `${userData.healthMetrics.hr} bpm` : 'TBA'}</h2></div></div></div>
                   <div className="metric-row"><div className="metric-info"><FaChartLine style={{ color: '#a855f7', fontSize: '18px' }} /><div><h4>BMI (Body Mass Index)</h4><h2>{bmiStatus ? bmiStatus.val : 'TBA'}</h2></div></div>{bmiStatus ? <span style={{ background: '#f1f5f9', color: bmiStatus.color, padding: '4px 10px', borderRadius: '15px', fontSize: '10px', fontWeight: 'bold' }}>{bmiStatus.label}</span> : <span className="metric-badge">PENDING</span>}</div>
                   <div className="metric-row"><div className="metric-info"><FaThermometerHalf style={{ color: '#f97316', fontSize: '18px' }} /><div><h4>Body Temperature</h4><h2>{userData?.healthMetrics?.temp ? `${userData.healthMetrics.temp} °C` : 'TBA'}</h2></div></div></div>
                   <div className="metric-row"><div className="metric-info"><FaTint style={{ color: '#0ea5e9', fontSize: '18px' }} /><div><h4>Blood Oxygen (SpO2)</h4><h2>{userData?.healthMetrics?.oxygen ? `${userData.healthMetrics.oxygen} %` : 'TBA'}</h2></div></div></div>
                 </div>
                 <div className="info-card-green">
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}><FaMapMarkerAlt style={{ fontSize: '20px' }} /><h3 style={{ margin: 0, fontSize: '16px' }}>Old Cabalan Health Center</h3></div>
                   <button onClick={() => window.open('https://maps.app.goo.gl/Zt2ABJNtpDLn7HodA', '_blank')} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', color: '#0bc25c', background: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}><FaMapMarkerAlt /> Get Directions</button>
                 </div>
               </div>
             </div>
           </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;