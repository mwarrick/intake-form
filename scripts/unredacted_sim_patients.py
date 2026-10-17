"""Fictional patients for scripts/make_unredacted_sims.py.

Every name, number and address here is made up: phone numbers use 555-01xx, emails use .test domains,
and the hospitals do not exist. The clinical stories follow the shape of a real 31-page fax packet
(samples/packets-real/R11.pdf) so the simulated packets exercise the same documents, unredacted.
"""

PATIENTS = [
    # 1. Mirrors the real packet: scalp cellulitis / kerion, alcohol use, depression, anemia.
    {
        "slug": "001",
        "last": "WHITFIELD", "first": "GERALD", "mi": "A", "sex": "Male", "age": 63, "dob": "03/22/1963",
        "mrn": "70418823", "account": "900184227113", "ssn4": "4471", "ssn": "XXX-XX-4471",
        "address": "1810 E 1st St (mailing - Mercy House)", "city": "Santa Ana, CA 92701", "phone": "714-555-0187",
        "language": "English", "english": True, "ethnicity": "Black", "marital": "Single", "religion": "Baptist",
        "homeless": True, "homeless_long": True,
        "hospital": "Harbor Vista Medical Center", "hospital_short": "HARBOR VISTA MC",
        "hosp_addr": "2401 Harbor Vista Dr, Santa Ana, CA 92704", "hosp_phone": "714-555-0100", "hosp_fax": "714-555-0199",
        "hosp_npi": "1588012346", "unit": "4 West", "bed": "412-B", "nursing_phone": "714-555-0141",
        "referrer": "Monica Alvarez, MSW", "referrer_first": "Monica", "referrer_phone": "714-555-0142",
        "referrer_email": "malvarez@harborvista.test", "authorized_by": "Dr. Priya Raman", "authorized_phone": "714-555-0150",
        "admit": "10/10/2026", "admit_time": "10/10/2026 18:42", "dc": "10/15/2026", "fax_date": "10/14/2026",
        "fax_stamp": "OCT-14-2026",
        "admitting": "Priya Raman, MD", "attending": "Priya Raman, MD", "referring_md": "Kevin Ostrander, DO",
        "pcp": "Lena Haddad, MD", "pcp_phone": "714-555-0163", "pcp_addr": "1120 W Warner Ave, Santa Ana, CA 92707",
        "consultant": "Samuel Okoye, MD", "consult_specialty": "Infectious Diseases",
        "wound_rn": "Teresa Lindqvist, RN, CWOCN", "sw": "Monica Alvarez, MSW", "hp_author": "Priya Raman, MD",
        "insurance": "CalOptima", "plan": "CalOptima Health Medi-Cal", "member_id": "91827364A", "cin": "91827364A",
        "health_id": "CO-4471-9182", "group": "MCAL-OC", "aid_code": "M1", "guarantor_status": "DISABLED",
        "emergency": ("Darlene Whitfield", "Sister", "714-555-0119"),
        "chief_complaint": "HEADACHE",
        "form_cc": "Cellulitis of scalp, kerion of occipital region of scalp, chest pain",
        "qual_dx": "Kerion, anemia, hypertension",
        "adm_dx": ["Cellulitis of scalp [L03.811]", "Kerion of occipital region of scalp [B35.0]", "Chest pain, unspecified type [R07.9]"],
        "wound": True, "wound_desc": "Head - lower/posterior, medial", "wound_independent": True,
        "substances": {"Alcohol": "10/10/2026"}, "withdrawals": False,
        "mh": ["Anxiety", "Depression"], "mh_type": "depression", "o2": False, "self_meds": True,
        "continent": True, "adls": True, "diabetic": False, "insulin": False, "anticoag": False,
        "ambulatory": True, "device": None, "car": False, "partner": False, "service_animal": False,
        "tb": None, "communicable": "None", "iv_abx": False,
        "attached": ["Face Sheet", "H&P", "Med List", "SW notes"],
        "cover_msg": "Attached is application and documentation for RECUP Care referral. Medications ordered and to be "
                     "delivered at bedside. Still awaiting Physical Therapy evaluation and Nurse ADL note; will send as soon "
                     "as available. Patient pending discharge tomorrow 10/15/2026. Discharge Summary to be sent when "
                     "completed. Patient does not require home health services.",
        "pmh": ["Blindness of right eye", "Hearing impaired person, right", "Homeless", "Hypertension", "Knee pain, right",
                "Low back pain"],
        "psh": "History reviewed. No pertinent surgical history.",
        "sched_meds": ["amLODIPINE, 10 mg, Oral, Daily", "atorvastatin, 80 mg, Oral, Daily", "escitalopram, 20 mg, Oral, Daily",
                       "hydroCHLOROthiazide, 25 mg, Oral, Daily", "melatonin, 5 mg, Oral, HS",
                       "piperacillin-tazobactam (Zosyn) 3.375 g in sodium chloride 0.9% 50 mL IVPB, 3.375 g, IntraVENOUS, Q8H NR",
                       "vancomycin (Vancocin) IVPB, 1,750 mg, IntraVENOUS, Q12H NR"],
        "prn_meds": ["acetaminophen, 650 mg, Q6H PRN", "HYDROcodone-acetaminophen, 1 tablet, Q4H PRN", "morphine, 2 mg, Q4H PRN",
                     "ondansetron, 4 mg, Q4H PRN"],
        "allergies": "No Known Allergies",
        "alcohol": ("Yes", "12 - 28", "4 or more times a week", "3 or 4", "Monthly"), "tobacco": "Never", "drugs": "Never",
        "weight": "130.2 kg (287 lb)", "bmi": "41.6",
        "vitals_hp": {"BP": "(!) 165/75", "Pulse": "92", "Resp": "18", "Temp": "37.1 °C (98.8 °F)", "SpO2": "95%"},
        "vitals_pn": {"BP": "(!) 143/63", "Pulse": "84", "Resp": "19", "Temp": "36.8 °C (98.2 °F)", "SpO2": "99%"},
        "hp_hpi": "Gerald Whitfield is a 63 years old male presenting with scalp infection not improving. He specifically "
                  "presented with occipital swelling and tenderness. He was seen at Westside Urgent Care ER a week ago and "
                  "diagnosed with a Kerion and prescribed an antifungal. Patient states he hit the back of his head 3 days ago "
                  "worsening the pain-- it may have been a syncopal episode. Also developed left-sided chest pain while walking "
                  "today, no radiation, no shortness of breath, sweats or nausea, no history of myocardial infarction. Pain has "
                  "resolved. In our ER, Hb was 7.5 (baseline unknown) and wbc was 13.2. Na 134. CT Neck showed R upper neck and "
                  "lower scalp cellulitis w/ no obvious abscess. He was started on IV abx.",
        "problems": ["Cellulitis of scalp", "Recently Diagnosed Kerion", "HTN", "Anemia (Microcytic)", "Obesity"],
        "plan_lines": ["---  Abx broad spectrum IV", "--- Likely Antifungal as well, ID eval, monitor closely",
                       "--- for anemia, monitor h/h --- r/o GI bleed, check stool for blood,", "Consider transfusion and GI eval."],
        "pn_update": "10/13: In essence cleared by ID for dc on oral abx and will need outpt Derm Bx, transfuse 1 u PRBC's, "
                     "f/u Stool for occult blood.",
        "pn_interval": "Pt in good spirits, pain controlled, for 1 u prbc's.",
        "exam_extra": "Back of neck bandaged.",
        # Two-page document after the face sheet: a wound care note (or PT eval when there is no wound).
        "doc2_kind": "wound",
        "doc2": {
            "subjective": "Per H&P- 63 years old male presenting with scalp infection not improving. He specifically presented "
                          "with occipital swelling and tenderness. He was seen at Westside Urgent Care a week ago and diagnosed "
                          "with a Kerion and prescribed an antifungal. Patient states he hit the back of his head 3 days ago "
                          "worsening the pain-- it may have been a syncopal episode.",
            "objective": ["Patient awake, alert, pleasant, and agreeable to wound care",
                          "Wound culture: Growing Staphylococcus aureus",
                          "Imaging: CT of Neck with Contrast- Edema is identified in the subcutaneous tissues of the right "
                          "suboccipital scalp, extending to the right upper neck. There is prominence of some of the fascia. "
                          "No focal fluid collection or mass is seen.", "Allergies: NKA"],
            "location": "RIGHT OCCIPITAL SCALP", "measure": "1 X 1 X 0.5 cm", "undermining": "0.3 cm circumferential",
            "tunneling": "None", "bed": "Red, moist", "periwound": "pink", "drainage": "moderate purulent amount",
            "care": "Cleansed with wound cleanser, Therahoney applied to wound bed, lightly packed with 1/4\" Iodoform packing "
                    "strip, covered with foam bordered dressing.",
            "plan": "Continue daily wound care: Cleanse with wound cleanser, apply Therahoney to wound bed, lightly pack the "
                    "wound cavity with 1/4\" Iodoform packing strip, cover with foam bordered dressing. The wound care team will "
                    "sign off; nurse to continue dressing changes. The wound care team remains available for support.",
        },
        "consult": {
            "micro": ["Wound Culture, scalp (10/10/2026): Staphylococcus aureus, MSSA - Cefazolin S, Clindamycin S, "
                      "Doxycycline S", "Blood Culture x2 (10/10/2026): No growth at 72 hours", "Fungal culture, scalp: pending"],
            "reason": "I was asked to see the patient for antibiotic recommendations",
            "cc": "Scalp lesion",
            "hpi": "Patient presented to the ER with a scalp lesion going on for 2 years also was noted to be anemic-patient "
                   "states something heavy was thrown on his head 2 years ago when he was staying at a shelter in Anaheim. "
                   "Since he's had these lesions he's seen two dermatologists-it does not look like any skin biopsies were done "
                   "but we do not have any results-patient states that neither of the dermatologist's were able to diagnose what "
                   "is going on-he went to Westside Urgent Care and was told he had tenia capitis infection. He does not seem to "
                   "have been on any antifungal therapy. Denies fevers or chills but he's complaining of drainage from the scalp.",
            "ros": "Skin: Positive for wound.",
            "exam": ["General: Awake alert no acute distress", "HEENT: Scalp dressing present photographs reviewed in the chart on epic",
                     "Neck: Supple", "Chest: Clear breath sounds bilaterally", "Cardiovascular: Regular rate rhythm S1-S2 present",
                     "Abdomen: Soft no guarding no rigidity bowel sounds present", "Extremities: No edema"],
            "imaging": [("CT Head WO/W Contrast", "10/10/2026", "Mild atrophy with chronic changes of the brain. No acute "
                         "intracranial process. Soft tissue edema. Cellulitis could be considered. No abscess is seen."),
                        ("CT Soft Tissue Neck With Contrast", "10/10/2026", "Edema in the subcutaneous tissues of the right upper "
                         "neck and lower scalp. Cellulitis could be considered. No abscess is seen. Nonspecific reactive cervical "
                         "lymph nodes."),
                        ("X-Ray Chest Single View", "10/10/2026", "Normal chest. No acute cardiopulmonary process.")],
            "assessment": ["-Potential tinea capitis infection of the scalp versus allergic contact dermatitis based on the "
                           "history-already seen 2 dermatologists but no skin biopsy done per patient although records not "
                           "available to review", "-secondary bacterial cellulitis with ongoing drainage",
                           "-leukocytosis rule out from infection or from profound anemia"],
            "plan": ["-Typical scalp bacteria causing infection would be Staph aureus or strep change to IV Ancef",
                     "-patient needs to see a dermatologist as soon as possible on discharge to consider doing a skin biopsy to be "
                     "100% sure this is just a tinea infection and not something else-treatment is outpatient and I would not "
                     "recommend any antifungal therapy until the diagnosis is confirmed by skin biopsy or by clinical judgment by "
                     "dermatologist-since this is a non life-threatening infection from an ID point he can discharge",
                     "-on discharge recommend p.o. Keflex 500 mg every 12 hours for 1 week along with wound care and urgent "
                     "referral to Dermatology", "-can stop vancomycin and Zosyn", "-continue wound care",
                     "-this was discussed with the patient and the nurse."],
        },
        "sw_note": [
            "SW acknowledged SS consult for homelessness.",
            "Patient is a 63y.o. male admitted on 10/10/2026 for cellulitis of scalp, kerion of occipital region of scalp, and "
            "chest pain. Demographics confirmed. Patients address on file is his mailing address, patient is unhoused. Per "
            "patient he is mostly independent and owns a cane and blood pressure machine as DME. No HH/SNF history. The patient "
            "reports he has both depression and anxiety that is managed by medication and a psychiatrist. Patient reports it "
            "works well for him and he has an appt this coming week. Patient declined additional mental health resources. "
            "Patient reports he drinks alcohol but did not want to disclose exact amounts. Per patient, he drinks daily. SW "
            "offered substance use resources, patient accepted. SW offered community and shelter resources, patient accepted.",
            "SW reviewed patients insurance, and offered IF RECUP referral - patient accepted. SW also offered assistance at DC "
            "to check shelters, patient in agreement. SW explained that we are not able to guarantee shelter placement at DC, "
            "patient understood.",
            "SW to return to bedside to resources.",
            "Pending DC orders and recommendations. DCP: community vs shelter placement.",
        ],
        "sw_addendum": "1:22pm: SW dropped resources at bedside. SW confirmed patients phone number and received permission to "
                       "provide his contact to Illumination Foundation.",
        "psychiatrist": "per patient - Dr. Nguyen through county BH - will see her this week",
        "labs": {"WBC": [13.2, 16.2, 17.0, 18.8, 13.9], "Hgb": [7.5, 7.1, 6.9, 7.7, 8.4], "Hct": [25.2, 24.6, 23.5, 26.8, 28.2],
                 "MCV": [59.1, 60.0, 59.9, 60.8, 61.2], "Plt": [416, 411, 396, 436, 452], "Na": [134, 135, 134, 135, 136],
                 "Glucose": [118, 97, 105, 110, 101]},
        "vitals_series": {"T": [36.8, 37.1, 36.9, 37.4, 36.6, 36.8, 37.0, 36.7, 36.9, 37.1],
                          "HR": [98, 92, 88, 86, 90, 84, 82, 88, 85, 80], "SBP": [165, 158, 150, 143, 149, 152, 147, 141, 138, 144],
                          "DBP": [75, 72, 70, 63, 68, 71, 66, 64, 62, 67], "RR": [18, 18, 19, 18, 17, 19, 18, 18, 16, 18],
                          "SpO2": [95, 96, 97, 99, 98, 97, 98, 99, 98, 97]},
        "lab_overrides": {"Ferritin": 9, "Iron": 22, "Hemoglobin A1c": 5.6},
        "consult_fu": "10/28/2026", "followups": [("Dermatology", "Referral placed - urgent", "714-555-0166", "pending")],
        "home_health": None, "covid_doses": 2, "o2_note": "N/A", "o2_device": "None (Room air)",
        "ambulate": "community distances", "fracture": False, "recent_surgery": False,
        "mh_treatment": (True, "escitalopram - county BH psychiatrist"), "pharmacy": None,
        "living": ("Unhoused", "Unhoused"), "transport_barrier": "no", "interpreter": None,
        "family_adjust": "Family not available",
        "font": 1,
    },
    # 2. Spanish-speaking woman, pneumonia / COPD exacerbation, walker, oral diabetes meds, no wound.
    {
        "slug": "002",
        "last": "REYES", "first": "DOLORES", "mi": "M", "sex": "Female", "age": 67, "dob": "07/09/1959",
        "mrn": "LP2208154", "account": "4403918275", "ssn4": "8092", "ssn": "XXX-XX-8092",
        "address": "No permanent address - staying in vehicle", "city": "Mission Viejo, CA 92691", "phone": "949-555-0126",
        "language": "Spanish", "english": False, "ethnicity": "Hispanic", "marital": "Widowed", "religion": "Catholic",
        "homeless": True, "homeless_long": False,
        "hospital": "Laguna Pines Medical Center", "hospital_short": "LAGUNA PINES MC",
        "hosp_addr": "27700 Medical Center Way, Mission Viejo, CA 92691", "hosp_phone": "949-555-0170", "hosp_fax": "949-555-0179",
        "hosp_npi": "1730045519", "unit": "3 North Telemetry", "bed": "318", "nursing_phone": "949-555-0172",
        "referrer": "Jordan Kim, RN Case Manager", "referrer_first": "Jordan", "referrer_phone": "949-555-0174",
        "referrer_email": "jkim@lagunapines.test", "authorized_by": "Dr. Alan Brooks", "authorized_phone": "949-555-0177",
        "admit": "10/09/2026", "admit_time": "10/09/2026 22:15", "dc": "10/15/2026", "fax_date": "10/14/2026",
        "fax_stamp": "OCT-14-2026",
        "admitting": "Alan Brooks, MD", "attending": "Alan Brooks, MD", "referring_md": "Maria Esposito, MD",
        "pcp": "Rafael Duarte, MD", "pcp_phone": "949-555-0181", "pcp_addr": "26800 Crown Valley Pkwy, Mission Viejo, CA 92691",
        "consultant": "Hannah Weiss, MD", "consult_specialty": "Pulmonary Disease",
        "wound_rn": "Brian Castillo, PT, DPT", "sw": "Luz Navarro, LCSW", "hp_author": "Alan Brooks, MD",
        "insurance": "CalOptima", "plan": "CalOptima Health OneCare (HMO D-SNP)", "member_id": "56473829B", "cin": "56473829B",
        "health_id": "CO-8092-5647", "group": "ONECARE", "aid_code": "1H", "guarantor_status": "RETIRED",
        "emergency": ("Marisol Reyes-Ortiz", "Daughter", "949-555-0133"),
        "chief_complaint": "SHORTNESS OF BREATH",
        "form_cc": "Community acquired pneumonia, COPD exacerbation, acute hypoxia (resolved)",
        "qual_dx": "Pneumonia, COPD exacerbation, DM2",
        "adm_dx": ["Pneumonia of right lower lobe due to infectious organism [J18.9]",
                   "COPD with (acute) exacerbation [J44.1]", "Acute respiratory failure with hypoxia [J96.01]"],
        "wound": False, "wound_desc": "", "wound_independent": None,
        "substances": {}, "withdrawals": False,
        "mh": [], "mh_type": "", "o2": False, "self_meds": True,
        "continent": True, "adls": True, "diabetic": True, "insulin": False, "anticoag": False,
        "ambulatory": True, "device": "front wheel walker", "car": True, "partner": False, "service_animal": False,
        "tb": ("10/11/2026", "Negative (CXR - no active TB)"), "communicable": "None - droplet isolation d/c'd 10/11",
        "iv_abx": False,
        "attached": ["Face Sheet", "H&P", "Med List", "PT/OT Eval.", "SW notes"],
        "cover_msg": "Please find attached referral packet for Recuperative Care. Patient has been weaned to room air and is "
                     "transitioning to oral antibiotics today. PT evaluation is attached; patient ambulates with front wheel "
                     "walker. Patient is Spanish speaking; daughter can assist with communication. Anticipated discharge "
                     "10/15/2026. Please call with any questions.",
        "pmh": ["COPD (chronic obstructive pulmonary disease)", "Type 2 diabetes mellitus without complication",
                "Essential hypertension", "Osteoarthritis of both knees", "Former tobacco use (quit 2019)"],
        "psh": "Cholecystectomy (2008). Right knee arthroscopy (2016).",
        "sched_meds": ["metFORMIN, 500 mg, Oral, BID with meals", "lisinopril, 10 mg, Oral, Daily",
                       "tiotropium (Spiriva Respimat) 2.5 mcg/actuation, 2 puff, Inhalation, Daily",
                       "budesonide-formoterol (Symbicort) 160-4.5 mcg, 2 puff, Inhalation, BID",
                       "predniSONE, 40 mg, Oral, Daily (day 5 of 5)",
                       "cefTRIAXone (Rocephin) 1 g in sodium chloride 0.9% 50 mL IVPB, 1 g, IntraVENOUS, Q24H",
                       "azithromycin (Zithromax), 500 mg, Oral, Daily", "enoxaparin (Lovenox), 40 mg, SubCUTAneous, Daily"],
        "prn_meds": ["albuterol 2.5 mg/3 mL nebulizer, 2.5 mg, Q4H PRN wheezing", "acetaminophen, 650 mg, Q6H PRN",
                     "guaiFENesin (Robitussin), 200 mg, Q4H PRN cough", "insulin lispro (HumaLOG), 0-6 Units, TID AC sliding scale"],
        "allergies": "Penicillins (Rash)",
        "alcohol": ("No", "0", "Never", "N/A", "Never"), "tobacco": "Former - quit 2019 (40 pack-years)", "drugs": "Never",
        "weight": "71.4 kg (157 lb)", "bmi": "29.7",
        "vitals_hp": {"BP": "152/84", "Pulse": "(!) 108", "Resp": "(!) 26", "Temp": "(!) 38.4 °C (101.1 °F)", "SpO2": "(!) 86%"},
        "vitals_pn": {"BP": "134/76", "Pulse": "88", "Resp": "18", "Temp": "36.9 °C (98.4 °F)", "SpO2": "94% on room air"},
        "hp_hpi": "Dolores Reyes is a 67 years old female, Spanish speaking (history obtained with interpreter #40122), with COPD "
                  "and type 2 diabetes who presents with 4 days of worsening shortness of breath, productive cough with yellow "
                  "sputum, and subjective fevers. She has been sleeping in her car since losing her apartment in August and ran "
                  "out of her inhalers 2 weeks ago. EMS found her SpO2 84% on room air, improved to 92% on 3L NC. In our ER, "
                  "temp 38.4, WBC 15.8, lactate 1.6, procalcitonin 0.9. CXR with right lower lobe consolidation. She received "
                  "duonebs, methylprednisolone 125 mg IV and ceftriaxone/azithromycin.",
        "problems": ["Community acquired pneumonia, RLL", "COPD exacerbation", "Acute hypoxic respiratory failure",
                     "DM2 (A1c 7.8)", "HTN", "Homelessness"],
        "plan_lines": ["--- Ceftriaxone + azithromycin, f/u blood/sputum cx", "--- Prednisone 40 mg x5 days, scheduled nebs, wean O2",
                       "--- Hold metformin while inpatient, SSI", "--- PT/OT eval, SW/CM for discharge planning."],
        "pn_update": "10/13: Weaned to room air at rest, SpO2 92-94%, ambulatory desat to 89% improved with pursed-lip breathing. "
                     "Transition to cefpodoxime 200 mg PO BID to complete 7 days. Pulm OK for dc. Resume home inhalers.",
        "pn_interval": "Pt feeling much better, cough improving, ambulated in hallway with PT.",
        "exam_extra": "Scattered expiratory wheezes, diminished R base.",
        "doc2_kind": "pt",
        "doc2": {
            "subjective": "Pt seen for PT evaluation with Spanish interpreter (iPad #40122). Pt reports she was independent "
                          "without device prior to admission, walks with a cane \"some days\" for knee pain. Lives in her car; "
                          "daughter lives in Riverside and is not able to house pt.",
            "objective": ["Pt seated in chair, alert and oriented x4, on room air, SpO2 95% at rest",
                          "Bed mobility: Supervision", "Sit to stand: Contact guard assist from chair, Supervision with FWW",
                          "Gait: 150 ft with front wheel walker, supervision, 1 standing rest break; SpO2 89% after "
                          "ambulation, recovered to 93% within 1 min with pursed-lip breathing",
                          "Stairs: 4 steps with handrail, contact guard assist",
                          "Balance: Tinetti 19/28 - moderate fall risk"],
            "location": "", "measure": "", "undermining": "", "tunneling": "", "bed": "", "periwound": "", "drainage": "",
            "care": "",
            "plan": "Recommend front wheel walker for all ambulation (DME ordered). Pt safe to discharge to a supportive "
                    "setting such as recuperative care; not safe to return to living in vehicle. No skilled HH PT needs if "
                    "placed in recuperative care. Pt educated on energy conservation and pursed-lip breathing; verbalized "
                    "understanding via interpreter.",
        },
        "consult": {
            "micro": ["Blood Culture x2 (10/09/2026): No growth at 96 hours", "Sputum Culture (10/10/2026): Normal respiratory "
                      "flora", "Legionella / Strep pneumo urine Ag: Negative", "Respiratory panel PCR: Negative"],
            "reason": "I was asked to see the patient for management of COPD exacerbation and pneumonia",
            "cc": "Shortness of breath",
            "hpi": "67 yo female with COPD (no PFTs on file, 40 pack-year history, quit 2019) admitted with RLL pneumonia and COPD "
                   "exacerbation with hypoxia requiring up to 4L NC on admission. She has had 2 prior exacerbations this year "
                   "treated at urgent care. She has been without maintenance inhalers for 2 weeks because her medications were "
                   "stolen from her car. No home oxygen. Now on room air at rest.",
            "ros": "Respiratory: Positive for cough and shortness of breath, improving.",
            "exam": ["General: Elderly female sitting in chair, speaking full sentences", "HEENT: Moist mucous membranes",
                     "Neck: No JVD", "Chest: Scattered expiratory wheezes, diminished R base, no accessory muscle use",
                     "Cardiovascular: Regular rate rhythm, no murmur", "Abdomen: Soft, non tender",
                     "Extremities: Trace bilateral ankle edema"],
            "imaging": [("X-Ray Chest 2 Views", "10/09/2026", "Right lower lobe consolidation compatible with pneumonia. "
                         "Hyperinflation consistent with COPD. No effusion."),
                        ("X-Ray Chest 2 Views", "10/12/2026", "Improving right lower lobe airspace disease."),
                        ("CTA Chest Pulmonary Embolism", "10/10/2026", "No pulmonary embolism. RLL consolidation. "
                         "Centrilobular emphysema.")],
            "assessment": ["-Acute exacerbation of COPD triggered by community acquired pneumonia, improving",
                           "-Acute hypoxic respiratory failure, resolved - room air at rest, borderline with exertion",
                           "-Medication access barrier: no maintenance inhalers x2 weeks"],
            "plan": ["-complete prednisone 40 mg x 5 days, no taper needed", "-transition to cefpodoxime 200 mg PO BID to "
                     "complete 7 days total antibiotics (PCN allergy - rash only, tolerating ceftriaxone)",
                     "-resume tiotropium + budesonide-formoterol; meds to beds prior to discharge with spacer teaching",
                     "-ambulatory O2 study done: does not qualify for home O2", "-outpatient PFTs and pulmonary f/u 4-6 weeks",
                     "-ok for discharge from pulmonary standpoint; recuperative care strongly recommended",
                     "-this was discussed with the patient via interpreter and her daughter by phone."],
        },
        "sw_note": [
            "SW consulted for discharge planning / housing insecurity.",
            "Patient is a 67y.o. female admitted on 10/09/2026 for pneumonia and COPD exacerbation. Interview completed in "
            "Spanish. Patient reports she lost her apartment in Mission Viejo in August 2026 after rent increase and has been "
            "sleeping in her 2011 Honda Civic in a church parking lot. This is her first episode of homelessness. Daughter "
            "Marisol lives in Riverside in a 1-bedroom with 3 children and is unable to house pt. Pt is independent with ADLs, "
            "uses a walker per PT. No mental health history, denies alcohol or drug use.",
            "SW reviewed insurance (CalOptima OneCare) and offered IF RECUP referral - patient and daughter in agreement. SW "
            "also provided CalOptima Housing Navigation and Coordinated Entry information. SW explained that we are not able to "
            "guarantee shelter placement at DC, patient understood.",
            "Pending DC orders and recommendations. DCP: Recuperative care.",
        ],
        "sw_addendum": "3:05pm: SW faxed referral to Illumination Foundation. Daughter Marisol (949-555-0133) given permission "
                       "to be contacted regarding placement.",
        "psychiatrist": "n/a",
        "labs": {"WBC": [15.8, 14.1, 12.2, 10.4, 9.1], "Hgb": [12.4, 11.9, 11.7, 12.0, 12.2],
                 "Hct": [37.8, 36.0, 35.4, 36.4, 37.0], "MCV": [88.2, 87.9, 88.4, 88.0, 88.1], "Plt": [298, 284, 301, 322, 340],
                 "Na": [137, 136, 138, 139, 138], "Glucose": [244, 286, 231, 198, 176]},
        "vitals_series": {"T": [38.4, 38.1, 37.6, 37.2, 37.0, 36.8, 36.9, 36.7, 36.9, 36.8],
                          "HR": [108, 104, 98, 94, 92, 90, 88, 86, 88, 84], "SBP": [152, 148, 141, 138, 134, 136, 132, 130, 134, 128],
                          "DBP": [84, 80, 78, 76, 76, 74, 72, 70, 76, 72], "RR": [26, 24, 22, 20, 20, 18, 18, 18, 18, 17],
                          "SpO2": [86, 91, 93, 94, 93, 94, 95, 94, 94, 95]},
        "lab_overrides": {"Hemoglobin A1c": 7.8, "CRP": 4.8, "Procalcitonin": 0.9, "Ferritin": 140, "Iron": 70,
                          "BNP": 88, "D-Dimer": 0.48},
        "consult_fu": "11/18/2026", "followups": [],
        "home_health": None, "covid_doses": 4, "o2_note": "Room air - weaned 10/12",
        "o2_device": "Nasal cannula 3 L/min -> Room air (10/12)", "ambulate": "150 ft w/ FWW", "fracture": False,
        "recent_surgery": False,
        "mh_treatment": (False, ""), "pharmacy": "CVS - Crown Valley Pkwy",
        "living": ("Vehicle", "Car"), "transport_barrier": "yes", "interpreter": "Yes - Spanish #40122",
        "family_adjust": "Supportive",
        "font": 0,
    },
    # 3. Diabetic foot osteomyelitis after partial ray amputation; insulin, meth use, PTSD, post-op shoe + walker.
    {
        "slug": "003",
        "last": "BANKS", "first": "TERRENCE", "mi": "L", "sex": "Male", "age": 54, "dob": "11/30/1971",
        "mrn": "WB00639127", "account": "220917634", "ssn4": "2305", "ssn": "XXX-XX-2305",
        "address": "General Delivery", "city": "Westminster, CA 92683", "phone": "657-555-0148",
        "language": "English", "english": True, "ethnicity": "White", "marital": "Divorced", "religion": "None",
        "homeless": True, "homeless_long": True,
        "hospital": "Westminster Bay Hospital", "hospital_short": "WESTMINSTER BAY HOSP",
        "hosp_addr": "15300 Bay Hospital Blvd, Westminster, CA 92683", "hosp_phone": "657-555-0110",
        "hosp_fax": "657-555-0119", "hosp_npi": "1932267701", "unit": "5 South Ortho/Surgical", "bed": "521-A",
        "nursing_phone": "657-555-0115",
        "referrer": "Keisha Doyle, LCSW", "referrer_first": "Keisha", "referrer_phone": "657-555-0112",
        "referrer_email": "kdoyle@westminsterbay.test", "authorized_by": "Dr. Victor Huang", "authorized_phone": "657-555-0116",
        "admit": "10/07/2026", "admit_time": "10/07/2026 11:03", "dc": "10/15/2026", "fax_date": "10/14/2026",
        "fax_stamp": "OCT-14-2026",
        "admitting": "Victor Huang, MD", "attending": "Victor Huang, MD", "referring_md": "Elise Park, DPM",
        "pcp": "None on file - assigned to Westminster Community Clinic", "pcp_phone": "657-555-0190",
        "pcp_addr": "14200 Goldenwest St, Westminster, CA 92683",
        "consultant": "Farid Haddadi, MD", "consult_specialty": "Infectious Diseases",
        "wound_rn": "Angela Moss, RN, CWCN", "sw": "Keisha Doyle, LCSW", "hp_author": "Victor Huang, MD",
        "insurance": "CalOptima", "plan": "CalOptima Health Medi-Cal", "member_id": "33012984C", "cin": "33012984C",
        "health_id": "CO-2305-3301", "group": "MCAL-OC", "aid_code": "L1", "guarantor_status": "UNEMPLOYED",
        "emergency": ("No Contact Specified", "", ""),
        "chief_complaint": "FOOT WOUND",
        "form_cc": "R foot diabetic ulcer w/ osteomyelitis 5th metatarsal, s/p partial 5th ray amputation 10/9",
        "qual_dx": "Osteomyelitis R foot s/p amputation, DM2 uncontrolled, post-op wound",
        "adm_dx": ["Diabetic foot ulcer, right foot, with osteomyelitis [E11.621, L97.514]",
                   "Acute osteomyelitis, right foot [M86.171]", "Type 2 diabetes mellitus with hyperglycemia [E11.65]"],
        "wound": True, "wound_desc": "R lateral foot surgical wound 4.0 x 1.8 x 0.6 cm, stage n/a", "wound_independent": False,
        "substances": {"Meth": "09/28/2026", "Alcohol": "08/2026"}, "withdrawals": False,
        "mh": ["Trauma-related"], "mh_type": "PTSD", "o2": False, "self_meds": True,
        "continent": True, "adls": True, "diabetic": True, "insulin": True, "anticoag": False,
        "ambulatory": True, "device": "walker + post-op shoe, heel weight bearing", "car": False, "partner": False,
        "service_animal": False,
        "tb": ("10/08/2026", "Negative (QuantiFERON)"), "communicable": "MRSA nares + (contact precautions)",
        "iv_abx": False,
        "attached": ["Face Sheet", "H&P", "Med List", "Surgical notes", "SW notes"],
        "cover_msg": "Referral for recuperative care for patient s/p right partial 5th ray amputation. ID has transitioned "
                     "patient to oral antibiotics (no PICC). Patient will need daily dressing changes; home health wound care "
                     "has been ordered through Coastline Home Health and can follow patient at recuperative care. Podiatry f/u "
                     "scheduled 10/21. Anticipated discharge 10/15/2026.",
        "pmh": ["Type 2 diabetes mellitus with hyperglycemia", "Diabetic peripheral neuropathy", "PTSD",
                "Methamphetamine use disorder, mild", "Hepatitis C, treated 2022 (SVR)", "Hyperlipidemia"],
        "psh": "Right partial 5th ray amputation (10/09/2026, Dr. Elise Park, DPM). Left index finger laceration repair (2015).",
        "sched_meds": ["insulin glargine (Lantus), 22 Units, SubCUTAneous, Nightly",
                       "insulin lispro (HumaLOG), 0-10 Units, SubCUTAneous, TID AC sliding scale", "metFORMIN, 1,000 mg, Oral, BID",
                       "atorvastatin, 40 mg, Oral, Daily", "gabapentin, 300 mg, Oral, TID", "sertraline, 50 mg, Oral, Daily",
                       "doxycycline hyclate, 100 mg, Oral, BID", "levoFLOXacin (Levaquin), 750 mg, Oral, Daily",
                       "nicotine 21 mg/24 hr patch, 1 patch, TransDERMal, Daily"],
        "prn_meds": ["oxyCODONE, 5 mg, Q6H PRN moderate pain", "acetaminophen, 1,000 mg, Q8H PRN", "glucose 4 g chewable, 16 g, PRN BG<70",
                     "traZODone, 50 mg, HS PRN sleep"],
        "allergies": "Sulfa (Sulfonamide Antibiotics) - Hives",
        "alcohol": ("Not Currently", "0", "Never", "N/A", "Never"), "tobacco": "Current Every Day Smoker - 1/2 ppd",
        "drugs": "Yes - Methamphetamine, smoked, last use 09/28/2026",
        "weight": "88.5 kg (195 lb)", "bmi": "27.2",
        "vitals_hp": {"BP": "(!) 148/92", "Pulse": "(!) 104", "Resp": "18", "Temp": "(!) 38.2 °C (100.8 °F)", "SpO2": "98%"},
        "vitals_pn": {"BP": "128/80", "Pulse": "78", "Resp": "16", "Temp": "36.7 °C (98.1 °F)", "SpO2": "98%"},
        "hp_hpi": "Terrence Banks is a 54 years old male with poorly controlled type 2 diabetes (A1c 11.4) and neuropathy who "
                  "presents with a draining wound on the outside of his right foot for 3 weeks, worse over the last 4 days with "
                  "redness up to the ankle and foul odor. He has been living on the street near Little Saigon and walking in "
                  "ill-fitting shoes. He has not taken insulin in about a month. In our ER, temp 38.2, WBC 17.4, glucose 386, "
                  "ESR 92, CRP 14.1. X-ray right foot showed cortical erosion of the 5th metatarsal head. MRI confirmed "
                  "osteomyelitis of the 5th metatarsal head and proximal phalanx without abscess.",
        "problems": ["Diabetic foot infection with osteomyelitis R 5th MT", "DM2 uncontrolled with hyperglycemia",
                     "Peripheral neuropathy", "Methamphetamine use", "PTSD", "Homelessness"],
        "plan_lines": ["--- Vancomycin + cefepime + metronidazole IV, f/u bone cx", "--- Podiatry consult for I&D vs amputation",
                       "--- Basal/bolus insulin, diabetes education, A1c", "--- ID consult, SW for dc planning."],
        "pn_update": "10/13: POD#4 s/p R partial 5th ray amputation, margins clean per path. Bone cx MSSA + strep agalactiae. "
                     "ID switched to PO doxycycline + levofloxacin x 6 wks total. BG 120-190 on Lantus 22u. Stable for dc to "
                     "recuperative care w/ HH wound care.",
        "pn_interval": "Pt pain controlled on PO meds, ambulating heel weight bearing with walker.",
        "exam_extra": "R foot: dressing C/D/I, post-op shoe in place.",
        "doc2_kind": "wound",
        "doc2": {
            "subjective": "Per H&P- 54 years old male with uncontrolled DM2 and neuropathy admitted with R foot diabetic ulcer "
                          "and osteomyelitis of 5th metatarsal, now POD#4 s/p R partial 5th ray amputation by podiatry (Dr. Park) "
                          "on 10/09/2026. Patient reports pain 3/10, states \"I can't really feel my foot anyway.\"",
            "objective": ["Patient awake, alert, cooperative with dressing change", "Bone culture: MSSA and Streptococcus "
                          "agalactiae (group B)", "Pathology: acute osteomyelitis, proximal margin negative",
                          "Allergies: Sulfa (hives)"],
            "location": "RIGHT LATERAL FOOT (5TH RAY AMPUTATION SITE)", "measure": "4.0 X 1.8 X 0.6 cm",
            "undermining": "None", "tunneling": "None", "bed": "70% red granulation, 30% yellow fibrin",
            "periwound": "intact, mild maceration", "drainage": "small serosanguinous",
            "care": "Cleansed with normal saline, skin prep to periwound, packed lightly with calcium alginate, covered with "
                    "ABD and kerlix, secured with tape. Post-op shoe reapplied.",
            "plan": "Daily dressing change: cleanse with NS, skin prep periwound, calcium alginate to wound bed, ABD and kerlix. "
                    "Heel weight bearing only in post-op shoe with walker. Patient NOT independent with wound care (unable to "
                    "visualize lateral foot) - home health RN ordered for daily dressing changes. Podiatry f/u 10/21/2026.",
        },
        "consult": {
            "micro": ["Bone Culture, R 5th metatarsal (10/09/2026): Staphylococcus aureus (MSSA); Streptococcus agalactiae",
                      "MRSA nares PCR (10/07/2026): POSITIVE", "Blood Culture x2 (10/07/2026): No growth at 5 days"],
            "reason": "I was asked to see the patient for antibiotic management of diabetic foot osteomyelitis",
            "cc": "Right foot wound",
            "hpi": "54 yo male with uncontrolled DM2, neuropathy, meth use, treated hepatitis C, admitted 10/07 with R lateral foot "
                   "ulcer probing to bone, MRI with osteomyelitis of 5th metatarsal head and proximal phalanx. Started on "
                   "empiric vancomycin, cefepime and metronidazole. Underwent R partial 5th ray amputation 10/09 with bone "
                   "culture growing MSSA and Group B strep. Proximal margin negative for osteomyelitis on pathology. MRSA nares "
                   "positive. Patient is homeless and reports injection drug use in the past (none since 2021) - PICC line not "
                   "favored.",
            "ros": "Skin: Positive for wound. MSK: R foot pain.",
            "exam": ["General: Awake alert no acute distress", "HEENT: Poor dentition", "Neck: Supple",
                     "Chest: Clear breath sounds bilaterally", "Cardiovascular: Regular rate rhythm, no murmur",
                     "Abdomen: Soft no guarding", "Extremities: R foot dressing clean dry intact, no erythema proximal to "
                     "dressing; diminished monofilament sensation bilateral feet"],
            "imaging": [("X-Ray Foot Right 3 Views", "10/07/2026", "Cortical erosion of the 5th metatarsal head concerning for "
                         "osteomyelitis. Soft tissue swelling and gas lateral forefoot."),
                        ("MRI Foot Right WO/W Contrast", "10/08/2026", "Osteomyelitis of the 5th metatarsal head and proximal "
                         "phalanx. Plantar lateral ulcer with sinus tract. No drainable abscess."),
                        ("X-Ray Foot Right 3 Views", "10/10/2026", "Interval partial 5th ray amputation. Expected post-op changes.")],
            "assessment": ["-Diabetic foot osteomyelitis R 5th MT s/p partial ray amputation with clean proximal margin",
                           "-Bone culture MSSA + Group B strep", "-MRSA nares colonization",
                           "-Uncontrolled DM2 (A1c 11.4), homelessness, stimulant use - high risk for nonadherence"],
            "plan": ["-stop vancomycin, cefepime and metronidazole", "-start doxycycline 100 mg PO BID + levofloxacin 750 mg PO "
                     "daily (sulfa allergy - avoid TMP-SMX)", "-total duration 3 weeks from surgery given clean margin; "
                     "reassess at ID clinic 10/28", "-no PICC indicated", "-weekly CBC, CMP, CRP via home health",
                     "-strongly recommend recuperative care for wound healing and glycemic control",
                     "-this was discussed with the patient, podiatry and the nurse."],
        },
        "sw_note": [
            "SW consulted for homelessness and substance use.",
            "Patient is a 54y.o. male admitted on 10/07/2026 for R foot diabetic infection, now s/p partial 5th ray amputation. "
            "Patient reports he has been homeless on and off for 6 years, most recently on the street in Westminster for 14 "
            "months. Receives mail at General Delivery. Patient reports PTSD from military contractor work overseas; not "
            "currently in treatment, open to referral. Reports smoking methamphetamine \"a couple times a week\", last use "
            "09/28/2026; not interested in residential treatment but accepted outpatient SUD resources. Denies alcohol since "
            "August.",
            "SW reviewed insurance (CalOptima Medi-Cal) and offered IF RECUP referral - patient accepted, states \"I need "
            "somewhere to keep this foot clean.\" Coastline Home Health accepted for wound care. SW explained that we are not "
            "able to guarantee placement at DC, patient understood.",
            "Pending DC orders and recommendations. DCP: Recuperative care with HH wound care.",
        ],
        "sw_addendum": "10:40am: SW provided bus pass and CalOptima BH line number. Patient gave permission to share contact "
                       "information with Illumination Foundation.",
        "psychiatrist": "None - referred to CalOptima Behavioral Health 855-555-0122",
        "labs": {"WBC": [17.4, 15.2, 12.8, 10.9, 9.6], "Hgb": [13.1, 12.4, 11.6, 11.2, 11.5], "Hct": [39.4, 37.2, 35.0, 33.9, 34.6],
                 "MCV": [86.0, 85.7, 86.2, 86.4, 86.1], "Plt": [388, 362, 341, 330, 318], "Na": [131, 133, 135, 136, 137],
                 "Glucose": [386, 274, 212, 168, 141]},
        "vitals_series": {"T": [38.2, 38.0, 37.5, 37.9, 37.2, 36.9, 37.0, 36.8, 36.7, 36.8],
                          "HR": [104, 100, 96, 98, 90, 84, 82, 80, 78, 78], "SBP": [148, 142, 138, 140, 132, 130, 128, 126, 128, 124],
                          "DBP": [92, 88, 86, 84, 82, 80, 80, 78, 80, 76], "RR": [18, 18, 17, 18, 16, 16, 16, 17, 16, 16],
                          "SpO2": [98, 97, 98, 97, 98, 98, 99, 98, 98, 98]},
        "lab_overrides": {"Hemoglobin A1c": 11.4, "CRP": 14.1, "Sed Rate (ESR)": 92, "Ferritin": 310, "Iron": 60,
                          "Lactic Acid": 1.9},
        "consult_fu": "10/28/2026", "followups": [("Podiatry", "Elise Park, DPM", "657-555-0118", "10/21/2026")],
        "home_health": ("Coastline Home Health  657-555-0161", ["Wound care"]), "covid_doses": 2, "o2_note": "N/A",
        "o2_device": "None (Room air)", "ambulate": "50 ft heel WB w/ walker", "fracture": False, "recent_surgery": True,
        "mh_treatment": (False, "none - referred to CalOptima BH"), "pharmacy": "Hospital meds-to-beds",
        "living": ("Unhoused", "Unhoused"), "transport_barrier": "yes", "interpreter": None,
        "family_adjust": "Family not available",
        "font": 2,
    },
    # 4. LA County: injection-related L calf abscess s/p I&D (MRSA), provoked DVT on apixaban, OUD on buprenorphine, bipolar.
    {
        "slug": "004",
        "last": "LUCERO", "first": "ANGELA", "mi": "R", "sex": "Female", "age": 48, "dob": "05/14/1978",
        "mrn": "EC3381472", "account": "61049327710", "ssn4": "6618", "ssn": "XXX-XX-6618",
        "address": "No fixed address - LA River encampment near N Main St", "city": "Los Angeles, CA 90031",
        "phone": "323-555-0158", "language": "English", "english": True, "ethnicity": "Hispanic", "marital": "Separated",
        "religion": "Catholic", "homeless": True, "homeless_long": True,
        "hospital": "Eastgate Community Hospital", "hospital_short": "EASTGATE COMM HOSP",
        "hosp_addr": "1900 Eastgate Ave, Los Angeles, CA 90033", "hosp_phone": "323-555-0120", "hosp_fax": "323-555-0129",
        "hosp_npi": "1467093825", "unit": "6 East Med/Surg", "bed": "614-A", "nursing_phone": "323-555-0123",
        "referrer": "Danielle Okafor, LCSW", "referrer_first": "Danielle", "referrer_phone": "323-555-0124",
        "referrer_email": "dokafor@eastgatehospital.test", "authorized_by": "Dr. Nathan Cho", "authorized_phone": "323-555-0125",
        "admit": "10/11/2026", "admit_time": "10/11/2026 03:27", "dc": "10/17/2026", "fax_date": "10/16/2026",
        "fax_stamp": "OCT-16-2026",
        "admitting": "Nathan Cho, MD", "attending": "Nathan Cho, MD", "referring_md": "Michael Tran, MD",
        "pcp": "None - referred to Eastside Community Health Center", "pcp_phone": "323-555-0130",
        "pcp_addr": "2210 E Cesar E Chavez Ave, Los Angeles, CA 90033",
        "consultant": "Rosa Delgado, MD", "consult_specialty": "Addiction Medicine",
        "wound_rn": "Patrice Holloway, RN, CWON", "sw": "Danielle Okafor, LCSW", "hp_author": "Nathan Cho, MD",
        "insurance": "L.A. Care", "plan": "L.A. Care Health Plan Medi-Cal", "member_id": "47120593D", "cin": "47120593D",
        "health_id": "LAC-6618-4712", "group": "MCAL-LA", "aid_code": "M1", "guarantor_status": "UNEMPLOYED",
        "emergency": ("Ruben Lucero", "Brother", "626-555-0147"),
        "chief_complaint": "LEG SWELLING",
        "form_cc": "L calf abscess s/p I&D (MRSA), L popliteal DVT, OUD on bupe",
        "qual_dx": "Cellulitis/abscess L leg s/p I&D, DVT on apixaban, OUD",
        "adm_dx": ["Cutaneous abscess of left lower limb [L02.416]", "Cellulitis of left lower limb [L03.116]",
                   "Acute embolism and thrombosis of left popliteal vein [I82.432]",
                   "Opioid use disorder, moderate [F11.20]"],
        "wound": True, "wound_desc": "L posterior calf I&D wound 3.2 x 2.0 x 1.5 cm, packed", "wound_independent": True,
        "substances": {"Heroin": "10/10/2026", "Opioid": "10/10/2026 (fentanyl)"}, "withdrawals": False,
        "mh": ["Bipolar", "Anxiety"], "mh_type": "bipolar II", "o2": False, "self_meds": True,
        "continent": True, "adls": True, "diabetic": False, "insulin": False, "anticoag": True,
        "ambulatory": True, "device": None, "car": False, "partner": False, "service_animal": False,
        "tb": ("10/12/2026", "Negative (QuantiFERON)"), "communicable": "HCV Ab+, MRSA wound - contact",
        "iv_abx": False,
        "attached": ["Face Sheet", "H&P", "Med List", "Wound Care", "Addiction Med consult", "SW notes"],
        "cover_msg": "Referral for recuperative care. Patient s/p bedside I&D L calf abscess 10/12, wound culture MRSA, now on "
                     "PO doxycycline. Also new L popliteal DVT - started apixaban, 30 day supply delivered meds-to-beds. "
                     "Inducted on buprenorphine-naloxone 16 mg daily; bridge clinic appt 10/23. Patient taught packing "
                     "and can do own dressing changes. Anticipated discharge 10/17/2026.",
        "pmh": ["Opioid use disorder (heroin/fentanyl, injection)", "Bipolar II disorder", "Generalized anxiety disorder",
                "Hepatitis C antibody positive (untreated)", "Prior L forearm abscess I&D (2024)", "Tobacco use"],
        "psh": "I&D left forearm abscess (2024). Bedside I&D left posterior calf abscess (10/12/2026, Dr. Michael Tran).",
        "sched_meds": ["apixaban (Eliquis), 10 mg, Oral, BID x 7 days then 5 mg BID",
                       "buprenorphine-naloxone (Suboxone) 8-2 mg film, 2 film, SubLINGual, Daily",
                       "doxycycline hyclate, 100 mg, Oral, BID", "lamoTRIgine, 100 mg, Oral, Daily",
                       "hydrOXYzine pamoate, 25 mg, Oral, TID", "nicotine 14 mg/24 hr patch, 1 patch, TransDERMal, Daily",
                       "naloxone 4 mg nasal spray - dispense kit at discharge"],
        "prn_meds": ["acetaminophen, 650 mg, Q6H PRN", "ibuprofen - HOLD while on apixaban", "ondansetron, 4 mg, Q6H PRN",
                     "cloNIDine, 0.1 mg, Q6H PRN withdrawal symptoms"],
        "allergies": "Vancomycin (Red man syndrome - infusion related)",
        "alcohol": ("Yes", "1 - 2", "Monthly or less", "1 or 2", "Never"), "tobacco": "Current Some Day Smoker - 5 cig/day",
        "drugs": "Yes - Heroin/fentanyl, injection, last use 10/10/2026",
        "weight": "61.7 kg (136 lb)", "bmi": "23.4",
        "vitals_hp": {"BP": "128/82", "Pulse": "(!) 112", "Resp": "20", "Temp": "(!) 38.6 °C (101.5 °F)", "SpO2": "97%"},
        "vitals_pn": {"BP": "118/74", "Pulse": "82", "Resp": "16", "Temp": "36.8 °C (98.2 °F)", "SpO2": "99%"},
        "hp_hpi": "Angela Lucero is a 48 years old female with opioid use disorder (injects heroin and fentanyl), bipolar II and "
                  "untreated hepatitis C who presents with 5 days of increasing pain, redness and swelling of the left calf "
                  "after injecting into the back of her leg. She has had chills at night. She lives in an encampment by the LA "
                  "River and has been homeless for about 3 years. In our ER, temp 38.6, HR 112, WBC 16.9, lactate 1.8. Bedside "
                  "ultrasound showed a 3.4 cm fluid collection of the L posterior calf. Venous duplex showed occlusive thrombus "
                  "of the left popliteal and posterior tibial veins. She was given IV vancomycin (developed flushing) and "
                  "changed to linezolid, and started on heparin drip.",
        "problems": ["L calf abscess with cellulitis s/p I&D", "Acute L popliteal DVT (provoked)", "Opioid use disorder",
                     "Bipolar II disorder", "Hepatitis C Ab positive", "Homelessness"],
        "plan_lines": ["--- Linezolid IV, surgery for I&D, f/u wound cx", "--- Heparin gtt -> apixaban once I&D done",
                       "--- Addiction Medicine consult, buprenorphine induction", "--- HCV RNA, HIV, SW for dc planning."],
        "pn_update": "10/15: Wound cx MRSA (doxy S). Changed to PO doxycycline to complete 10 days. On apixaban, no bleeding "
                     "from wound. Buprenorphine 16 mg daily, COWS 2, no cravings. Pt independent with packing, ok for dc "
                     "to recup 10/17.",
        "pn_interval": "Pt calm, pain controlled, walking in hall, taught wound packing by wound RN.",
        "exam_extra": "L calf: packed wound, erythema receding inside marked borders, calf soft.",
        "doc2_kind": "wound",
        "doc2": {
            "subjective": "Per H&P- 48 years old female with injection opioid use admitted with L posterior calf abscess and "
                          "cellulitis, s/p bedside I&D by general surgery 10/12/2026. Also found to have L popliteal DVT, on "
                          "apixaban. Patient reports pain 4/10 with dressing change, wants to learn to do it herself.",
            "objective": ["Patient awake, alert, engaged in teaching", "Wound culture: MRSA (doxycycline S, TMP-SMX S)",
                          "Imaging: US soft tissue L calf 10/11 - 3.4 x 2.1 cm complex fluid collection; duplex - occlusive "
                          "thrombus L popliteal and posterior tibial veins", "Allergies: Vancomycin (red man)"],
            "location": "LEFT POSTERIOR CALF (I&D SITE)", "measure": "3.2 X 2.0 X 1.5 cm", "undermining": "0.5 cm at 12 o'clock",
            "tunneling": "None", "bed": "Beefy red granulation", "periwound": "erythema 2 cm, receding", "drainage": "small "
            "serous", "care": "Removed packing, irrigated with normal saline, packed with plain 1/2\" packing strip, covered "
                              "with ABD pad and kerlix. Patient performed packing with teach-back.",
            "plan": "Daily packing change: irrigate with NS, pack with 1/2\" plain packing strip, cover with ABD and kerlix. "
                    "Patient demonstrated independent packing x2 and is independent with wound care. Supplies for 14 days "
                    "given at discharge. Surgery wound check 10/22/2026. Wound care team signing off.",
        },
        "consult": {
            "micro": ["Wound Culture, L calf abscess (10/12/2026): Staphylococcus aureus, MRSA - Doxycycline S, TMP-SMX S, "
                      "Vancomycin S, Clindamycin R", "Blood Culture x2 (10/11/2026): No growth at 5 days",
                      "HIV 1/2 Ag/Ab (10/12/2026): Nonreactive", "Hepatitis C Ab (10/12/2026): REACTIVE - HCV RNA pending"],
            "reason": "I was asked to see the patient for opioid use disorder and withdrawal management",
            "cc": "Opioid withdrawal",
            "hpi": "48 yo female with 12 years of opioid use, injecting heroin and more recently fentanyl about 1 g per day, last "
                   "use 10/10 at 10pm. Two prior attempts on methadone (2019, 2022), left because of distance to clinic. No "
                   "prior buprenorphine. One overdose in 2025 reversed with naloxone by a friend. Admitted with L calf "
                   "abscess and DVT. Developed withdrawal on 10/11, COWS 14.",
            "ros": "Psych: Positive for anxiety and cravings. GI: nausea.",
            "exam": ["General: Anxious, yawning, diaphoretic on initial exam", "HEENT: Pupils 5 mm, rhinorrhea",
                     "Neck: Supple", "Chest: Clear breath sounds bilaterally", "Cardiovascular: Tachycardic, regular",
                     "Abdomen: Soft, active bowel sounds", "Extremities: L calf dressing; track marks bilateral forearms"],
            "imaging": [("US Duplex Venous LE Left", "10/11/2026", "Occlusive thrombus in the left popliteal and posterior tibial "
                         "veins. Femoral vein patent."),
                        ("US Soft Tissue Left Calf", "10/11/2026", "3.4 x 2.1 cm complex fluid collection of the posterior calf "
                         "compatible with abscess. Surrounding subcutaneous edema."),
                        ("X-Ray Tibia/Fibula Left 2 Views", "10/11/2026", "Soft tissue swelling. No soft tissue gas. No bone "
                         "destruction.")],
            "assessment": ["-Opioid use disorder, severe, in early remission in a controlled environment",
                           "-Opioid withdrawal, resolved after buprenorphine induction", "-Injection-related MRSA abscess and DVT",
                           "-High overdose risk at discharge - homelessness, fentanyl supply, recent loss of tolerance"],
            "plan": ["-continue buprenorphine-naloxone 16-4 mg SL daily", "-discharge with 7 day bridge prescription; "
                     "Eastgate bridge clinic 10/23/2026", "-naloxone kit and overdose education given",
                     "-syringe services and fentanyl test strips information given", "-HCV RNA pending - refer for treatment",
                     "-recuperative care strongly recommended; buprenorphine is not a contraindication",
                     "-this was discussed with the patient, who agrees."],
        },
        "sw_note": [
            "SW consulted for homelessness and substance use.",
            "Patient is a 48y.o. female admitted on 10/11/2026 for L calf abscess and DVT. Patient reports she has lived in an "
            "encampment along the LA River for about 3 years after separating from her husband. She has a brother in El Monte "
            "who she talks to and who is willing to be a contact but cannot house her. Patient reports bipolar disorder, "
            "previously treated at county DMH, not seen in over a year; lamotrigine restarted here. Patient started on "
            "buprenorphine and wants to stay on it. Denies daily alcohol.",
            "SW reviewed insurance (L.A. Care Medi-Cal) and offered IF RECUP referral - patient accepted. SW also referred "
            "to LA County DMH and LAHSA Coordinated Entry. SW explained that we are not able to guarantee placement at DC, "
            "patient understood.",
            "Pending DC orders and recommendations. DCP: Recuperative care, bridge clinic for buprenorphine.",
        ],
        "sw_addendum": "11:15am: SW gave patient a TAP card and a charged phone from the hospital phone program "
                       "(323-555-0158). Patient gave permission to share contact information with Illumination Foundation.",
        "psychiatrist": "None current - previously LA County DMH Boyle Heights clinic, referral placed 323-555-0132",
        "labs": {"WBC": [16.9, 14.2, 11.8, 10.3, 9.4], "Hgb": [11.8, 11.1, 10.9, 11.0, 11.3], "Hct": [35.6, 33.8, 33.0, 33.4, 34.1],
                 "MCV": [89.4, 89.1, 89.6, 89.3, 89.0], "Plt": [412, 396, 371, 384, 402], "Na": [134, 136, 137, 137, 138],
                 "Glucose": [112, 98, 104, 94, 101]},
        "vitals_series": {"T": [38.6, 38.3, 37.9, 37.4, 37.2, 36.9, 37.0, 36.8, 36.7, 36.8],
                          "HR": [112, 108, 104, 100, 92, 88, 84, 86, 82, 80], "SBP": [128, 124, 132, 136, 122, 120, 118, 124, 118, 116],
                          "DBP": [82, 78, 84, 86, 76, 74, 72, 78, 74, 72], "RR": [20, 20, 18, 18, 17, 16, 16, 16, 16, 16],
                          "SpO2": [97, 98, 98, 97, 99, 98, 99, 99, 98, 99]},
        "lab_overrides": {"D-Dimer": 3.8, "CRP": 9.6, "Sed Rate (ESR)": 61, "Lactic Acid": 1.8, "Procalcitonin": 0.34,
                          "US Duplex Venous LE Bilateral": "Final (L only)"},
        "consult_fu": "10/23/2026", "followups": [("General Surgery", "Michael Tran, MD", "323-555-0127", "10/22/2026"),
                                                  ("Hepatology", "Referral placed - HCV treatment", "323-555-0133", "pending")],
        "home_health": None, "covid_doses": 1, "o2_note": "N/A", "o2_device": "None (Room air)",
        "ambulate": "community distances", "fracture": False, "recent_surgery": True,
        "mh_treatment": (False, "lamotrigine restarted - DMH referral placed"), "pharmacy": "Hospital meds-to-beds",
        "living": ("Unhoused", "Encampment"), "transport_barrier": "yes", "interpreter": None,
        "family_adjust": "Brother supportive by phone",
        "font": 3,
    },
    # 5. Vietnamese-speaking man, acute on chronic HFrEF, CKD 3a, recently evicted to a shelter, cane, no wound.
    {
        "slug": "005",
        "last": "PHAM", "first": "MINH", "mi": "Q", "sex": "Male", "age": 71, "dob": "02/03/1955",
        "mrn": "HV00918236", "account": "3308812457", "ssn4": "3920", "ssn": "XXX-XX-3920",
        "address": "Lighthouse Emergency Shelter, 1440 Pacific Ave", "city": "Long Beach, CA 90813", "phone": "562-555-0161",
        "language": "Vietnamese", "english": False, "ethnicity": "Asian - Vietnamese", "marital": "Widowed",
        "religion": "Buddhist", "homeless": True, "homeless_long": False,
        "hospital": "Long Beach Harborview Medical Center", "hospital_short": "LB HARBORVIEW MC",
        "hosp_addr": "3100 Harborview Blvd, Long Beach, CA 90806", "hosp_phone": "562-555-0140", "hosp_fax": "562-555-0149",
        "hosp_npi": "1295510487", "unit": "7 Cardiac Telemetry", "bed": "706-B", "nursing_phone": "562-555-0143",
        "referrer": "Grace Lim, RN Case Manager", "referrer_first": "Grace", "referrer_phone": "562-555-0144",
        "referrer_email": "glim@lbharborview.test", "authorized_by": "Dr. Omar Siddiqui", "authorized_phone": "562-555-0145",
        "admit": "10/08/2026", "admit_time": "10/08/2026 14:51", "dc": "10/14/2026", "fax_date": "10/13/2026",
        "fax_stamp": "OCT-13-2026",
        "admitting": "Omar Siddiqui, MD", "attending": "Omar Siddiqui, MD", "referring_md": "Omar Siddiqui, MD",
        "pcp": "Thu Tran, MD", "pcp_phone": "562-555-0151", "pcp_addr": "1825 E Anaheim St, Long Beach, CA 90813",
        "consultant": "Jennifer Albright, MD", "consult_specialty": "Cardiology",
        "wound_rn": "Carlos Medina, PT, DPT", "sw": "Helen Vo, MSW", "hp_author": "Omar Siddiqui, MD",
        "insurance": "L.A. Care", "plan": "L.A. Care Medicare Plus (HMO D-SNP)", "member_id": "82206419E", "cin": "82206419E",
        "health_id": "LAC-3920-8220", "group": "DSNP-LA", "aid_code": "10", "guarantor_status": "RETIRED",
        "emergency": ("Kevin Pham", "Son", "408-555-0142"),
        "chief_complaint": "SHORTNESS OF BREATH, LEG SWELLING",
        "form_cc": "Acute on chronic systolic heart failure (EF 30%), CKD 3a, DM2",
        "qual_dx": "CHF exacerbation, CKD 3a, DM2",
        "adm_dx": ["Acute on chronic systolic (congestive) heart failure [I50.23]",
                   "Chronic kidney disease, stage 3a [N18.31]", "Type 2 diabetes mellitus without complications [E11.9]"],
        "wound": False, "wound_desc": "", "wound_independent": None,
        "substances": {}, "withdrawals": False,
        "mh": [], "mh_type": "", "o2": False, "self_meds": True,
        "continent": True, "adls": True, "diabetic": True, "insulin": False, "anticoag": False,
        "ambulatory": True, "device": "single point cane", "car": False, "partner": False, "service_animal": False,
        "tb": ("10/09/2026", "Negative (CXR - no active TB)"), "communicable": "None",
        "iv_abx": False,
        "attached": ["Face Sheet", "H&P", "Med List", "PT Eval.", "Echo report", "SW notes"],
        "cover_msg": "Referral for Recuperative Care for 71 yo Vietnamese speaking male admitted with heart failure "
                     "exacerbation. Diuresed 6 kg, now on oral furosemide and room air. Needs daily weights, 2 g sodium diet "
                     "and help with new medications - shelter cannot provide. PT eval attached, walks with cane. Son in San "
                     "Jose is involved by phone. Anticipated discharge 10/14/2026.",
        "pmh": ["Heart failure with reduced ejection fraction (EF 30%)", "Ischemic cardiomyopathy, s/p PCI to LAD (2019)",
                "Type 2 diabetes mellitus", "Chronic kidney disease stage 3a", "Hypertension", "Benign prostatic hyperplasia"],
        "psh": "PCI with drug-eluting stent to LAD (2019). TURP (2017).",
        "sched_meds": ["furosemide (Lasix), 40 mg, Oral, BID", "carvedilol, 6.25 mg, Oral, BID with meals",
                       "sacubitril-valsartan (Entresto) 24-26 mg, 1 tablet, Oral, BID", "spironolactone, 12.5 mg, Oral, Daily",
                       "empagliflozin (Jardiance), 10 mg, Oral, Daily", "aspirin, 81 mg, Oral, Daily",
                       "atorvastatin, 80 mg, Oral, Daily", "tamsulosin, 0.4 mg, Oral, HS",
                       "heparin 5,000 Units, SubCUTAneous, Q8H (inpatient only)"],
        "prn_meds": ["acetaminophen, 650 mg, Q6H PRN", "senna, 8.6 mg, HS PRN constipation",
                     "insulin lispro (HumaLOG), 0-6 Units, TID AC sliding scale", "melatonin, 3 mg, HS PRN"],
        "allergies": "Lisinopril (Angioedema)",
        "alcohol": ("No", "0", "Never", "N/A", "Never"), "tobacco": "Former - quit 2019 (30 pack-years)", "drugs": "Never",
        "weight": "68.2 kg (150 lb) - admit 74.3 kg", "bmi": "24.9",
        "vitals_hp": {"BP": "(!) 168/96", "Pulse": "(!) 104", "Resp": "(!) 24", "Temp": "36.6 °C (97.9 °F)", "SpO2": "(!) 89%"},
        "vitals_pn": {"BP": "112/68", "Pulse": "72", "Resp": "16", "Temp": "36.7 °C (98.1 °F)", "SpO2": "96% on room air"},
        "hp_hpi": "Minh Pham is a 71 years old male, Vietnamese speaking (history obtained with interpreter #51807), with "
                  "ischemic cardiomyopathy EF 30%, DM2 and CKD 3a who presents with 1 week of worsening shortness of breath, "
                  "orthopnea (sleeping sitting up) and leg swelling. He was evicted from his apartment on 09/18 when the "
                  "building was sold and has been at a shelter where he could not keep his medicines refrigerated or follow a "
                  "low salt diet; he ran out of Entresto and furosemide about 10 days ago. In our ER, SpO2 89% on room air, "
                  "BNP 1,840, troponin 38 (flat), creatinine 1.5 (baseline 1.3). CXR with pulmonary edema and small bilateral "
                  "effusions. Given furosemide 80 mg IV and placed on 2 L NC.",
        "problems": ["Acute on chronic HFrEF exacerbation", "Medication nonadherence due to housing loss", "CKD 3a",
                     "DM2 (A1c 7.1)", "HTN", "Homelessness - recent"],
        "plan_lines": ["--- IV furosemide, strict I/O, daily weights, 2 g Na diet", "--- Resume GDMT as renal function allows",
                       "--- Cardiology consult, TTE", "--- PT eval, SW/CM for discharge planning."],
        "pn_update": "10/12: Net -5.9 L, weight 74.3 -> 68.2 kg. Room air since 10/11. Cr 1.4. Transitioned to furosemide 40 mg "
                     "PO BID, Entresto, carvedilol, spironolactone, empagliflozin resumed. Cardiology ok for dc.",
        "pn_interval": "Pt breathing comfortably, lying flat, ambulated 200 ft with PT.",
        "exam_extra": "Trace bilateral ankle edema, JVP 7 cm, bibasilar crackles resolved.",
        "doc2_kind": "pt",
        "doc2": {
            "subjective": "Pt seen for PT evaluation with Vietnamese interpreter (phone #51807). Pt reports he walked with a "
                          "cane for the past 2 years for balance. Was living alone in an apartment until September, now at a "
                          "shelter where he climbs 1 flight of stairs to the dorm. Son lives in San Jose.",
            "objective": ["Pt supine in bed, alert and oriented x4, on room air, SpO2 96% at rest",
                          "Bed mobility: Modified independent", "Sit to stand: Independent with armrests",
                          "Gait: 200 ft with single point cane, supervision, slow cadence; SpO2 93% after ambulation, "
                          "HR 72 -> 96, Borg dyspnea 3/10",
                          "Stairs: 12 steps with 1 handrail and cane, supervision, 1 rest break",
                          "Balance: Berg 44/56 - low to moderate fall risk"],
            "location": "", "measure": "", "undermining": "", "tunneling": "", "bed": "", "periwound": "", "drainage": "",
            "care": "",
            "plan": "Continue single point cane. Pt safe to discharge to recuperative care with supervision for stairs. "
                    "Educated on energy conservation, daily weights and reporting a 2 lb gain in a day or 5 lb in a week - "
                    "pt verbalized understanding via interpreter. No skilled HH PT needs if placed in recuperative care.",
        },
        "consult": {
            "micro": ["Blood Culture x2: Not ordered", "Urinalysis (10/08/2026): Negative for infection",
                      "COVID-19 / Influenza / RSV PCR (10/08/2026): Not detected"],
            "reason": "I was asked to see the patient for acute decompensated heart failure",
            "cc": "Shortness of breath",
            "hpi": "71 yo male with ischemic cardiomyopathy (LAD PCI 2019), LVEF 30-35% on last echo 2025, DM2, CKD 3a, "
                   "admitted with acute decompensated HF in the setting of running out of medications after losing his "
                   "housing. No chest pain. Troponin low and flat, ECG without acute changes. Followed at the Harborview heart "
                   "failure clinic, last seen 06/2026.",
            "ros": "Cardiovascular: Positive for orthopnea and leg swelling, improving.",
            "exam": ["General: Elderly male lying at 30 degrees, no distress", "HEENT: Anicteric",
                     "Neck: JVP 7 cm (12 cm on admission)", "Chest: Clear, no crackles today",
                     "Cardiovascular: Regular rate, S3 not appreciated, 2/6 holosystolic murmur apex",
                     "Abdomen: Soft, non tender", "Extremities: Trace bilateral ankle edema, warm"],
            "imaging": [("X-Ray Chest 2 Views", "10/08/2026", "Cardiomegaly. Pulmonary vascular congestion with interstitial "
                         "edema. Small bilateral pleural effusions."),
                        ("Transthoracic echo (TTE)", "10/09/2026", "LVEF 30%. Anterior and apical akinesis. Moderate mitral "
                         "regurgitation. Mildly dilated left atrium. RVSP 42 mmHg."),
                        ("X-Ray Chest 2 Views", "10/11/2026", "Improved pulmonary edema. Trace bilateral effusions.")],
            "assessment": ["-Acute on chronic HFrEF (LVEF 30%), NYHA III on admission, now II, euvolemic",
                           "-Precipitant: medication nonadherence due to loss of housing, dietary sodium",
                           "-CKD 3a, creatinine at baseline after diuresis", "-No evidence of acute coronary syndrome"],
            "plan": ["-furosemide 40 mg PO BID, recheck BMP in 1 week", "-continue sacubitril-valsartan 24-26 mg BID (ACE "
                     "inhibitor angioedema history - 36 h washout not needed, no ACE inhibitor on board)",
                     "-continue carvedilol, spironolactone, empagliflozin", "-daily weights, 2 g sodium, 2 L fluid restriction",
                     "-HF clinic f/u 11/04/2026", "-ok for discharge; recuperative care strongly recommended for medication "
                     "supervision and diet", "-this was discussed with the patient via interpreter and his son by phone."],
        },
        "sw_note": [
            "SW consulted for discharge planning / housing.",
            "Patient is a 71y.o. male admitted on 10/08/2026 for heart failure. Interview completed in Vietnamese with "
            "interpreter. Patient reports he rented a room in a building on Anaheim St for 11 years; the building was sold "
            "and tenants were evicted 09/18/2026. He has been at Lighthouse Emergency Shelter since 09/20. This is his first "
            "episode of homelessness. Son Kevin lives in San Jose with his family and is helping look for senior housing but "
            "cannot house pt now. Pt receives SSI. Independent with ADLs, uses a cane. No mental health history, no alcohol or "
            "drug use.",
            "SW reviewed insurance (L.A. Care Medicare Plus D-SNP) and offered IF RECUP referral - patient and son in "
            "agreement. SW also gave Long Beach Multi-Service Center and senior housing waitlist information. SW explained "
            "that we are not able to guarantee placement at DC, patient understood.",
            "Pending DC orders and recommendations. DCP: Recuperative care.",
        ],
        "sw_addendum": "2:40pm: SW spoke with son Kevin (408-555-0142), who agrees with plan and gives permission to be "
                       "contacted by Illumination Foundation. Shelter bed held until 10/15.",
        "psychiatrist": "n/a",
        "labs": {"WBC": [7.8, 7.2, 6.9, 7.1, 6.8], "Hgb": [11.6, 11.9, 12.3, 12.6, 12.4], "Hct": [35.2, 36.0, 37.4, 38.1, 37.6],
                 "MCV": [91.2, 90.8, 91.0, 91.4, 91.1], "Plt": [214, 205, 221, 230, 226], "Na": [132, 133, 135, 136, 136],
                 "Glucose": [168, 142, 151, 138, 129]},
        "vitals_series": {"T": [36.6, 36.8, 36.7, 36.9, 36.6, 36.7, 36.8, 36.6, 36.7, 36.7],
                          "HR": [104, 98, 92, 88, 84, 80, 78, 76, 74, 72], "SBP": [168, 156, 142, 134, 126, 122, 118, 116, 114, 112],
                          "DBP": [96, 90, 84, 80, 76, 74, 72, 70, 70, 68], "RR": [24, 22, 20, 20, 18, 18, 17, 16, 16, 16],
                          "SpO2": [89, 92, 93, 94, 94, 95, 95, 96, 96, 96]},
        "lab_overrides": {"BNP": 1840, "Troponin I, High Sensitivity": 38, "Creatinine": 1.45, "BUN": 31,
                          "eGFR - high estimate": 49, "Hemoglobin A1c": 7.1, "Potassium": 4.6,
                          "Transthoracic echo (TTE)": "Final - EF 30%"},
        "consult_fu": "11/04/2026", "followups": [("Nephrology", "Ravi Menon, MD", "562-555-0136", "11/12/2026")],
        "home_health": None, "covid_doses": 3, "o2_note": "Room air - weaned 10/11",
        "o2_device": "Nasal cannula 2 L/min -> Room air (10/11)", "ambulate": "200 ft w/ cane", "fracture": False,
        "recent_surgery": False,
        "mh_treatment": (False, ""), "pharmacy": "Walgreens - Atlantic Ave & Anaheim St",
        "living": ("Shelter", "Emergency shelter"), "transport_barrier": "yes", "interpreter": "Yes - Vietnamese #51807",
        "family_adjust": "Supportive",
        "font": 0,
    },
    # 6. Pedestrian struck: R trimalleolar ankle fracture s/p ORIF, NWB with walker/wheelchair, schizophrenia on LAI, no TB test.
    {
        "slug": "006",
        "last": "DUNCAN", "first": "MARCUS", "mi": "J", "sex": "Male", "age": 39, "dob": "08/19/1987",
        "mrn": "FR51177304", "account": "780230119", "ssn4": "5174", "ssn": "XXX-XX-5174",
        "address": "Unhoused - Fullerton Transportation Center area", "city": "Fullerton, CA 92832", "phone": "None",
        "language": "English", "english": True, "ethnicity": "White", "marital": "Single", "religion": "Unknown",
        "homeless": True, "homeless_long": True,
        "hospital": "Fullerton Ridge Medical Center", "hospital_short": "FULLERTON RIDGE MC",
        "hosp_addr": "4100 Ridgeline Dr, Fullerton, CA 92835", "hosp_phone": "714-555-0121", "hosp_fax": "714-555-0128",
        "hosp_npi": "1609934472", "unit": "3 West Ortho", "bed": "309", "nursing_phone": "714-555-0122",
        "referrer": "Tasha Greene, RN Case Manager", "referrer_first": "Tasha", "referrer_phone": "714-555-0126",
        "referrer_email": "tgreene@fullertonridge.test", "authorized_by": "Dr. Daniel Whitaker", "authorized_phone": "714-555-0134",
        "admit": "10/08/2026", "admit_time": "10/08/2026 21:09", "dc": "10/16/2026", "fax_date": "10/15/2026",
        "fax_stamp": "OCT-15-2026",
        "admitting": "Sofia Marquez, MD", "attending": "Sofia Marquez, MD", "referring_md": "Daniel Whitaker, MD",
        "pcp": "None on file", "pcp_phone": "", "pcp_addr": "",
        "consultant": "Daniel Whitaker, MD", "consult_specialty": "Orthopedic Surgery",
        "wound_rn": "Lauren Pak, PT, DPT", "sw": "Ernesto Ruiz, MSW", "hp_author": "Sofia Marquez, MD",
        "insurance": "CalOptima", "plan": "CalOptima Health Medi-Cal", "member_id": "29384756F", "cin": "29384756F",
        "health_id": "CO-5174-2938", "group": "MCAL-OC", "aid_code": "60", "guarantor_status": "DISABLED",
        "emergency": ("Linda Duncan", "Mother", "951-555-0117"),
        "chief_complaint": "PEDESTRIAN VS AUTO, R ANKLE INJURY",
        "form_cc": "R trimalleolar ankle fx s/p ORIF 10/9, NWB RLE x 6 wks, schizophrenia",
        "qual_dx": "R ankle fx s/p ORIF, NWB, schizophrenia",
        "adm_dx": ["Displaced trimalleolar fracture of right lower leg, initial encounter for closed fracture [S82.851A]",
                   "Pedestrian injured in collision with car in traffic accident [V03.10XA]",
                   "Schizophrenia, unspecified [F20.9]"],
        "wound": False, "wound_desc": "", "wound_independent": None,
        "substances": {"Other": "10/08/2026 (cannabis)"}, "withdrawals": False,
        "mh": ["Schizophrenia"], "mh_type": "schizophrenia", "o2": False, "self_meds": True,
        "continent": True, "adls": True, "diabetic": False, "insulin": False, "anticoag": True,
        "ambulatory": True, "device": "FWW (NWB R) + wheelchair", "car": False, "partner": False,
        "service_animal": False,
        "tb": None, "communicable": "None",
        "iv_abx": False,
        "attached": ["Face Sheet", "H&P", "Med List", "Op note", "PT/OT Eval.", "SW notes"],
        "cover_msg": "Recuperative care referral for 39 yo male s/p ORIF R ankle 10/09. NON weight bearing R leg x 6 weeks. "
                     "Transfers and walks short distances with walker, wheelchair provided for distance. Lovenox x 4 weeks "
                     "(pt self-injecting). Psychiatrically stable on Invega Sustenna, next dose due 11/02. TB test NOT done - "
                     "QuantiFERON can be drawn before dc if required. Home health PT/OT ordered. Anticipated dc 10/16/2026.",
        "pmh": ["Schizophrenia (dx age 22), stable on long-acting injectable", "Cannabis use", "Tobacco use",
                "Asthma, mild intermittent"],
        "psh": "ORIF right trimalleolar ankle fracture (10/09/2026, Dr. Daniel Whitaker).",
        "sched_meds": ["enoxaparin (Lovenox), 40 mg, SubCUTAneous, Daily x 28 days", "acetaminophen, 1,000 mg, Oral, Q8H",
                       "paliperidone palmitate (Invega Sustenna), 156 mg, IntraMUSCULAR, monthly - last given 10/05/2026",
                       "docusate-senna, 1 tablet, Oral, BID", "cholecalciferol, 2,000 Units, Oral, Daily",
                       "nicotine 14 mg/24 hr patch, 1 patch, TransDERMal, Daily"],
        "prn_meds": ["oxyCODONE, 5 mg, Q4H PRN moderate pain (dc with 5 day supply)", "albuterol HFA, 2 puff, Q4H PRN",
                     "ondansetron, 4 mg, Q6H PRN", "hydrOXYzine, 25 mg, Q6H PRN anxiety"],
        "allergies": "Haloperidol (Dystonic reaction)",
        "alcohol": ("Yes", "1 - 3", "Monthly or less", "1 or 2", "Never"), "tobacco": "Current Every Day Smoker - 1 ppd",
        "drugs": "Yes - Cannabis, smoked, daily",
        "weight": "79.4 kg (175 lb)", "bmi": "24.4",
        "vitals_hp": {"BP": "(!) 146/88", "Pulse": "(!) 108", "Resp": "18", "Temp": "36.9 °C (98.4 °F)", "SpO2": "98%"},
        "vitals_pn": {"BP": "122/76", "Pulse": "76", "Resp": "16", "Temp": "36.8 °C (98.2 °F)", "SpO2": "98%"},
        "hp_hpi": "Marcus Duncan is a 39 years old male with schizophrenia who presents by ambulance after being struck by a "
                  "car at low speed while crossing Harbor Blvd at night. He was knocked to the ground and could not bear weight "
                  "on his right ankle. No head strike, no loss of consciousness per witnesses. He has been homeless in "
                  "Fullerton for about 3 years and gets a monthly Invega Sustenna injection at the county clinic, last 10/05. "
                  "In our ER, obvious deformity of the R ankle, neurovascularly intact. X-ray showed a displaced trimalleolar "
                  "fracture with lateral talar subluxation; closed reduction and splinting done in the ER. CT head and C-spine "
                  "negative. Trauma survey otherwise negative.",
        "problems": ["R trimalleolar ankle fracture s/p ORIF", "Pedestrian struck by vehicle", "Schizophrenia, stable",
                     "Post-op VTE prophylaxis", "Tobacco and cannabis use", "Homelessness"],
        "plan_lines": ["--- Ortho consult, closed reduction/splint, ORIF 10/9", "--- Pain control, Lovenox DVT ppx post-op",
                       "--- Continue LAI, psych consult if needed", "--- PT/OT, SW for dc planning (NWB, unhoused)."],
        "pn_update": "10/14: POD#5 s/p ORIF R ankle, incision C/D/I in splint. NWB RLE x 6 wks. PT: transfers and 30 ft with "
                     "FWW, wheelchair for distance. Pt taught Lovenox self-injection, teach-back done. Mental status at "
                     "baseline. Stable for dc to recup with HH PT/OT.",
        "pn_interval": "Pt pleasant, pain 3/10 on PO meds, working with PT on NWB gait.",
        "exam_extra": "R LE: posterior splint in place, toes warm, cap refill < 2 s, sensation intact.",
        "doc2_kind": "pt",
        "doc2": {
            "subjective": "Pt seen for PT evaluation POD#3 s/p R ankle ORIF. Pt reports he was independent without device prior "
                          "to injury, walked several miles a day. Lives unhoused, sleeps near the Fullerton train station. Pain "
                          "4/10 at rest, 6/10 with dependent positioning.",
            "objective": ["Pt supine, alert and oriented x4, R LE in posterior splint, NWB",
                          "Bed mobility: Modified independent with rail", "Sit to stand: Contact guard assist with FWW, "
                          "maintained NWB R with cues x1",
                          "Gait: 30 ft with front wheel walker, hop-to pattern, NWB R, contact guard -> supervision",
                          "Wheelchair: Independent propulsion 150 ft, independent with brakes and leg rest",
                          "Stairs: Not attempted - unsafe NWB; bump up/down 1 curb with assist"],
            "location": "", "measure": "", "undermining": "", "tunneling": "", "bed": "", "periwound": "", "drainage": "",
            "care": "",
            "plan": "NWB R LE x 6 weeks per ortho. FWW for short distances, wheelchair for community distances (DME "
                    "delivered). Not safe to return to unsheltered living - unable to manage NWB on uneven surfaces. "
                    "Recommend recuperative care (ground floor, no stairs) with HH PT/OT. OT: lower body dressing modified "
                    "independent with reacher and sock aid.",
        },
        "consult": {
            "micro": ["MRSA nares PCR (10/08/2026): Negative", "Urine drug screen (10/08/2026): Positive for cannabinoids",
                      "Blood alcohol (10/08/2026): <10 mg/dL", "COVID-19 PCR (10/08/2026): Not detected"],
            "reason": "I was asked to see the patient for right ankle fracture",
            "cc": "Right ankle pain",
            "hpi": "39 yo right hand dominant male, pedestrian struck by car at low speed 10/08, with closed displaced right "
                   "trimalleolar ankle fracture and lateral talar subluxation. Closed reduction and posterior splint in the "
                   "ER with improved alignment. Skin intact, no tenting after reduction. Smoker. Unhoused, previously "
                   "independent community ambulator.",
            "ros": "MSK: Positive for R ankle pain and swelling.",
            "exam": ["General: Alert, cooperative, no distress", "HEENT: Atraumatic", "Neck: Non tender, full ROM",
                     "Chest: Clear bilaterally", "Cardiovascular: Regular rate rhythm",
                     "Abdomen: Soft, non tender", "Extremities: R ankle in splint, swelling, skin intact, DP/PT 2+ by "
                     "doppler, sensation intact to light touch all distributions"],
            "imaging": [("X-Ray Ankle Right 3 Views", "10/08/2026", "Displaced trimalleolar fracture with lateral subluxation "
                         "of the talus. Soft tissue swelling."),
                        ("CT Ankle Right WO Contrast", "10/08/2026", "Trimalleolar fracture; posterior malleolar fragment "
                         "involving approximately 25% of the articular surface. No additional fractures."),
                        ("X-Ray Ankle Right 3 Views", "10/09/2026", "Interval ORIF with lateral plate and screws, medial "
                         "malleolar screws and posterior malleolar fixation. Anatomic alignment of the mortise.")],
            "assessment": ["-Closed displaced R trimalleolar ankle fracture s/p ORIF 10/09/2026, hardware in good position",
                           "-Smoker - higher risk of wound complication and nonunion",
                           "-Unhoused - unable to maintain NWB and keep incision clean without supportive setting"],
            "plan": ["-NWB R LE x 6 weeks in splint, then CAM boot at first post-op visit", "-elevate above heart, ice",
                     "-enoxaparin 40 mg SC daily x 28 days for VTE prophylaxis", "-keep splint clean and dry, do not remove",
                     "-ortho clinic 10/23/2026 for splint removal, suture removal and x-ray",
                     "-smoking cessation strongly advised", "-recuperative care strongly recommended",
                     "-this was discussed with the patient and the primary team."],
        },
        "sw_note": [
            "SW consulted for homelessness and discharge planning.",
            "Patient is a 39y.o. male admitted on 10/08/2026 after being struck by a car, now s/p R ankle ORIF. Patient reports "
            "he has been homeless in Fullerton for about 3 years and before that lived with his mother in Riverside. He does "
            "not have a phone; mother Linda (951-555-0117) is his contact and is willing to help but cannot house him. Patient "
            "is followed by OC Health Care Agency Behavioral Health in Anaheim for schizophrenia and receives a monthly "
            "injection; reports he is doing well and has not been hospitalized for mental health since 2021. Smokes cannabis "
            "daily, declines SUD treatment.",
            "SW reviewed insurance (CalOptima Medi-Cal) and offered IF RECUP referral - patient accepted. SW notified his "
            "county BH case manager of admission. SW explained that we are not able to guarantee placement at DC, patient "
            "understood.",
            "Pending DC orders and recommendations. DCP: Recuperative care with HH PT/OT; wheelchair and walker delivered.",
        ],
        "sw_addendum": "4:10pm: SW spoke with county BH case manager Alicia Ford (714-555-0135); next Invega dose scheduled "
                       "11/02/2026. Patient gave permission to share information with Illumination Foundation; contact "
                       "through mother.",
        "psychiatrist": "Dr. Imani Brooks, OC Health Care Agency BH Anaheim - 714-555-0135",
        "labs": {"WBC": [11.8, 12.4, 10.1, 9.2, 8.7], "Hgb": [14.6, 13.1, 11.2, 10.8, 11.4], "Hct": [43.8, 39.4, 33.9, 32.6, 34.2],
                 "MCV": [90.1, 90.4, 90.0, 89.8, 90.2], "Plt": [276, 251, 229, 248, 287], "Na": [139, 138, 137, 138, 139],
                 "Glucose": [131, 142, 118, 104, 96]},
        "vitals_series": {"T": [36.9, 37.0, 37.3, 37.8, 37.4, 37.1, 36.9, 36.8, 36.9, 36.8],
                          "HR": [108, 98, 92, 96, 88, 84, 80, 78, 76, 76], "SBP": [146, 138, 132, 128, 126, 124, 120, 122, 124, 122],
                          "DBP": [88, 84, 80, 78, 78, 76, 74, 76, 78, 76], "RR": [18, 18, 18, 18, 17, 16, 16, 16, 16, 16],
                          "SpO2": [98, 98, 97, 96, 97, 98, 98, 98, 98, 98]},
        "lab_overrides": {"Total CK": 1450, "Hemoglobin A1c": 5.4, "Lactic Acid": 2.3, "Ferritin": 180, "Iron": 74,
                          "X-Ray Foot Right 3 Views": "Final (ankle)"},
        "consult_fu": "10/23/2026", "followups": [("Psychiatry", "Imani Brooks, MD - OC HCA BH", "714-555-0135", "11/02/2026")],
        "home_health": ("Bright Path Home Health  714-555-0131", ["Physical therapy", "Occupational therapy"]),
        "covid_doses": 0, "o2_note": "N/A", "o2_device": "None (Room air)",
        "ambulate": "30 ft NWB R w/ FWW; wheelchair", "fracture": True, "recent_surgery": True,
        "mh_treatment": (True, "Invega Sustenna monthly - OC HCA BH Anaheim"), "pharmacy": "Hospital meds-to-beds",
        "living": ("Unhoused", "Unhoused"), "transport_barrier": "yes", "interpreter": None,
        "family_adjust": "Mother supportive, unable to house",
        "font": 1,
    },
]
