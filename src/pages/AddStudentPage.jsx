import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, Timestamp, collection, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import "../styles/AddStudent.css";

const validateStudent = (student) => {
  const errors = {};
  const requiredFields = [
    "studentId", "candidateName", "candidateNumber",
    "college", "course", "whatsappNumber", "dob",
    "gender", "fatherName", "parentNumber", "adhaarNumber",
    "place", "reference.userName"
  ];

  requiredFields.forEach((key) => {
    if (key.startsWith("reference.")) {
      const field = key.split(".")[1];
      if (!student.reference?.[field]) {
        errors[key] = "This field is required.";
      }
    }
    else if (!student[key]) {
      errors[key] = "This field is required.";
    }
  });

  if (student.studentId && !/^\d+$/.test(student.studentId)) {
    errors.studentId = "Student ID should contain only numbers.";
  }

  if (student.candidateNumber && !/^\d{10}$/.test(student.candidateNumber)) {
    errors.candidateNumber = "Enter a valid 10-digit number.";
  }

  if (student.parentNumber && !/^\d{10}$/.test(student.parentNumber)) {
    errors.parentNumber = "Enter a valid 10-digit number.";
  }

  if (student.whatsappNumber && !/^\d{10}$/.test(student.whatsappNumber)) {
    errors.whatsappNumber = "Enter a valid 10-digit number.";
  }

  if (student.adhaarNumber && !/^\d{12}$/.test(student.adhaarNumber)) {
    errors.adhaarNumber = "Enter a valid 12-digit Aadhaar number.";
  }

  return errors;
};

const Stepper = ({ currentStep }) => (
  <div className="stepper">
    <div className={`step ${currentStep === 1 ? "active" : ""}`}>
      <div className="circle">1</div>
      <span>Verify</span>
    </div>
    <div className={`step ${currentStep === 2 ? "active" : ""}`}>
      <div className="circle">2</div>
      <span>Details</span>
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div className="add_student_modal_overlay">
      <div className="add_student_modal_content">
        <div className="add_student_modal_header">
          <svg className="add_student_modal_icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm0-12h2v10h-2V5z"
            />
          </svg>
          <h2 className="add_student_modal_title">{message.name}</h2>
        </div>
        <div className="add_student_modal_body">
          <p className="add_student_modal_text">{message.text}</p>
        </div>
        <div className="add_student_modal_footer">
          <button
            className="add_student_modal_button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const AddStudent = () => {
  const [student, setStudent] = useState({
    studentId: "",
    candidateName: "",
    candidateNumber: "",
    candidateEmail: "",
    college: "",
    course: "",
    whatsappNumber: "",
    dob: "",
    gender: "",
    fatherName: "",
    parentNumber: "",
    alternativeNumber: "",
    adhaarNumber: "",
    place: "",
    plusTwoRegNumber: "",
    plusTwoSchoolName: "",
    plusTwoSchoolPlace: "",
    lastQualification: "",
    lastQualificationMarks: "",
    totalAmountPaid: "",
    paidToCollege: "",
    paymentRemark: "",
    createdBy: "",
    dateOfAdmission: "",
    reference: {
      userName: "",
      consultancyName: "",
      totalSC: "",
      committedSC: ""
    }
  });

  const [formErrors, setFormErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState({ name: "", text: "" });
  const [submissionStatus, setSubmissionStatus] = useState("idle");
  const [collegeOptions, setCollegeOptions] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const snapshot = await getDocs(collection(db, "blr-college"));
        const options = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          courses: doc.data().courses || [],
        }));
        setCollegeOptions(options);
      } catch {
        toast.error("Failed to load colleges.");
      }
    };

    fetchColleges();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setStudent(prev => ({
            ...prev,
            reference: {
              ...prev.reference,
              consultancyName: userData.userType === "Freelance Associate"
                ? ""
                : userData.consultancyName || ""
              // Removed automatic setting of userName
            }
          }));
        }
      }
    };

    loadUserData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("reference.")) {
      const field = name.split(".")[1];
      setStudent(prev => ({
        ...prev,
        reference: {
          ...prev.reference,
          [field]: value
        }
      }));
    }
    else if (name === "college") {
      const selected = collegeOptions.find((c) => c.name === value);
      setCourseOptions(selected?.courses || []);
      setStudent((prev) => ({ ...prev, course: "", [name]: value }));
    }
    else {
      setStudent((prev) => ({ ...prev, [name]: value }));
    }

    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleVerify = async () => {
    const id = student.studentId.trim();

    if (!id || !/^\d+$/.test(id)) {
      setFormErrors({ studentId: "Please enter a valid numeric Student ID." });
      return;
    }

    const docSnap = await getDoc(doc(db, "km-blr", id));
    if (docSnap.exists()) {
      const data = docSnap.data();
      setModalMessage({ name: data.candidateName, text: "Student ID already exists." });
      setIsModalOpen(true);
    } else {
      setCurrentStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep !== 2) return;

    const errors = validateStudent(student);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setModalMessage({ name: "Validation", text: "Please correct the errors." });
      setIsModalOpen(true);
      return;
    }

    const user = auth.currentUser;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!user) {
      setModalMessage({ name: "Error", text: "User not authenticated." });
      setIsModalOpen(true);
      return;
    }

    setSubmissionStatus("loading");

    const studentData = {
      ...student,
      createdAt: Timestamp.now(),
      createdBy: user.uid
    };

    try {
      await setDoc(doc(db, "km-blr", student.studentId), studentData);
      setSubmissionStatus("idle");
      setModalMessage({ name: student.candidateName, text: "Student successfully enrolled!" });
      setIsModalOpen(true);
      setStudent({
        studentId: "",
        candidateName: "",
        candidateNumber: "",
        candidateEmail: "",
        college: "",
        course: "",
        whatsappNumber: "",
        dob: "",
        gender: "",
        fatherName: "",
        parentNumber: "",
        alternativeNumber: "",
        adhaarNumber: "",
        place: "",
        plusTwoRegNumber: "",
        plusTwoSchoolName: "",
        plusTwoSchoolPlace: "",
        lastQualification: "",
        lastQualificationMarks: "",
        totalAmountPaid: "",
        paidToCollege: "",
        paymentRemark: "",
        createdBy: "",
        dateOfAdmission: "",
        reference: {
          userName: "",
          consultancyName: userDoc.data().userType === "Freelance Associate"
            ? ""
            : userDoc.data().consultancyName || "",
          totalSC: "",
          committedSC: ""
        }
      });
      setCurrentStep(1);
    } catch (err) {
      setSubmissionStatus("idle");
      setModalMessage({ name: "Error", text: "Something went wrong." });
      setIsModalOpen(true);
    }
  };

  return (
    <div className="modern-enrollment-container">
      <div className="modern-header">
        <div className="modern-header-content">
          <h1 className="modern-title">Student Enrollment</h1>
          <p className="modern-subtitle">
            {currentStep === 1 ? "Verify student ID before proceeding" : "Complete all required student details"}
          </p>
        </div>
        <div className="modern-header-accent"></div>
      </div>

      <div className="modern-stepper-container">
        <div className={`modern-step ${currentStep === 1 ? "active" : ""}`}>
          <div className="modern-step-circle">1</div>
          <div className="modern-step-label">Verification</div>
        </div>
        <div className={`modern-step-connector ${currentStep === 2 ? "active" : ""}`}></div>
        <div className={`modern-step ${currentStep === 2 ? "active" : ""}`}>
          <div className="modern-step-circle">2</div>
          <div className="modern-step-label">Details</div>
        </div>
      </div>

      <form className="modern-enrollment-form" onSubmit={handleSubmit}>
        {currentStep === 1 && (
          <div className="modern-verify-step">
            <div className="modern-input-group">
              <label htmlFor="studentId" className="modern-input-label">
                Register Number <span className="modern-required">*</span>
              </label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                value={student.studentId}
                onChange={handleChange}
                placeholder="Enter 10th Register Number"
                className={`modern-input ${formErrors.studentId ? "error" : ""}`}
              />
              {formErrors.studentId && (
                <span className="modern-error-message">
                  <svg className="modern-error-icon" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z" />
                  </svg>
                  {formErrors.studentId}
                </span>
              )}
            </div>
            <button
              type="button"
              className="modern-primary-btn"
              onClick={handleVerify}
            >
              Verify Student ID
              <svg className="modern-btn-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M3,5V19H21V5H3M5,7H19V17H5V7M10.5,10.5A1.5,1.5 0 0,0 9,12A1.5,1.5 0 0,0 10.5,13.5A1.5,1.5 0 0,0 12,15A1.5,1.5 0 0,0 13.5,13.5A1.5,1.5 0 0,0 15,12A1.5,1.5 0 0,0 13.5,10.5A1.5,1.5 0 0,0 12,9A1.5,1.5 0 0,0 10.5,10.5M7,9A1,1 0 0,0 6,10V14A1,1 0 0,0 7,15H17A1,1 0 0,0 18,14V10A1,1 0 0,0 17,9H15C15,7.89 14.1,7 13,7H11C9.89,7 9,7.89 9,9H7Z" />
              </svg>
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="modern-details-step">
            <div className="modern-form-sections">
              {/* Candidate Details Section */}
              <div className="modern-form-section">
                <div className="modern-section-header">
                  <h3 className="modern-section-title">
                    <svg className="modern-section-icon" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                    </svg>
                    Candidate Details
                  </h3>
                  <div className="modern-section-divider"></div>
                </div>
                <div className="modern-input-grid">
                  <div className="modern-input-group">
                    <label htmlFor="candidateName" className="modern-input-label">
                      Full Name <span className="modern-required">*</span>
                    </label>
                    <input
                      type="text"
                      id="candidateName"
                      name="candidateName"
                      value={student.candidateName}
                      onChange={handleChange}
                      placeholder="Enter candidate's full name"
                      className={`modern-input ${formErrors.candidateName ? "error" : ""}`}
                    />
                    {formErrors.candidateName && (
                      <span className="modern-error-message">{formErrors.candidateName}</span>
                    )}
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="candidateNumber" className="modern-input-label">
                      Mobile Number <span className="modern-required">*</span>
                    </label>
                    <input
                      type="text"
                      id="candidateNumber"
                      name="candidateNumber"
                      value={student.candidateNumber}
                      onChange={handleChange}
                      placeholder="Enter 10-digit number"
                      className={`modern-input ${formErrors.candidateNumber ? "error" : ""}`}
                    />
                    {formErrors.candidateNumber && (
                      <span className="modern-error-message">{formErrors.candidateNumber}</span>
                    )}
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="candidateEmail" className="modern-input-label">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="candidateEmail"
                      name="candidateEmail"
                      value={student.candidateEmail}
                      onChange={handleChange}
                      placeholder="Enter candidate's email"
                      className="modern-input"
                    />
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="college" className="modern-input-label">
                      College <span className="modern-required">*</span>
                    </label>
                    <select
                      id="college"
                      name="college"
                      value={student.college}
                      onChange={handleChange}
                      className={`modern-input ${formErrors.college ? "error" : ""}`}
                    >
                      <option value="">Select College</option>
                      {collegeOptions.map((college) => (
                        <option key={college.id} value={college.name}>
                          {college.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.college && (
                      <span className="modern-error-message">{formErrors.college}</span>
                    )}
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="course" className="modern-input-label">
                      Course <span className="modern-required">*</span>
                    </label>
                    <select
                      id="course"
                      name="course"
                      value={student.course}
                      onChange={handleChange}
                      disabled={!student.college}
                      className={`modern-input ${formErrors.course ? "error" : ""}`}
                    >
                      <option value="">Select Course</option>
                      {courseOptions.map((course, index) => (
                        <option key={index} value={course}>
                          {course}
                        </option>
                      ))}
                    </select>
                    {formErrors.course && (
                      <span className="modern-error-message">{formErrors.course}</span>
                    )}
                  </div>
                  
                  <div className="modern-input-group">
                    <label htmlFor="dateOfAdmission" className="modern-input-label">
                      Date of Admission
                    </label>
                    <input
                      type="date"
                      id="dateOfAdmission"
                      name="dateOfAdmission"
                      value={student.dateOfAdmission}
                      onChange={handleChange}
                      className="modern-input"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Details Section */}
              <div className="modern-form-section">
                <div className="modern-section-header">
                  <h3 className="modern-section-title">
                    <svg className="modern-section-icon" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12,3A4,4 0 0,1 16,7A4,4 0 0,1 12,11A4,4 0 0,1 8,7A4,4 0 0,1 12,3M16,13.54C16,14.6 15.72,17.07 13.81,19.83L13,15L13.94,13.12C13.32,13.05 12.67,13 12,13C11.33,13 10.68,13.05 10.06,13.12L11,15L10.19,19.83C8.28,17.07 8,14.6 8,13.54C5.61,14.24 4,15.5 4,17V21H20V17C20,15.5 18.4,14.24 16,13.54Z" />
                    </svg>
                    Personal Details
                  </h3>
                  <div className="modern-section-divider"></div>
                </div>
                <div className="modern-input-grid">
                  <div className="modern-input-group">
                    <label htmlFor="whatsappNumber" className="modern-input-label">
                      WhatsApp Number <span className="modern-required">*</span>
                    </label>
                    <input
                      type="text"
                      id="whatsappNumber"
                      name="whatsappNumber"
                      value={student.whatsappNumber}
                      onChange={handleChange}
                      placeholder="Enter WhatsApp number"
                      className={`modern-input ${formErrors.whatsappNumber ? "error" : ""}`}
                    />
                    {formErrors.whatsappNumber && (
                      <span className="modern-error-message">{formErrors.whatsappNumber}</span>
                    )}
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="dob" className="modern-input-label">
                      Date of Birth <span className="modern-required">*</span>
                    </label>
                    <input
                      type="date"
                      id="dob"
                      name="dob"
                      value={student.dob}
                      onChange={handleChange}
                      className={`modern-input ${formErrors.dob ? "error" : ""}`}
                    />
                    {formErrors.dob && (
                      <span className="modern-error-message">{formErrors.dob}</span>
                    )}
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="gender" className="modern-input-label">
                      Gender <span className="modern-required">*</span>
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={student.gender}
                      onChange={handleChange}
                      className={`modern-input ${formErrors.gender ? "error" : ""}`}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {formErrors.gender && (
                      <span className="modern-error-message">{formErrors.gender}</span>
                    )}
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="fatherName" className="modern-input-label">
                      Father's Name <span className="modern-required">*</span>
                    </label>
                    <input
                      type="text"
                      id="fatherName"
                      name="fatherName"
                      value={student.fatherName}
                      onChange={handleChange}
                      placeholder="Enter father's name"
                      className={`modern-input ${formErrors.fatherName ? "error" : ""}`}
                    />
                    {formErrors.fatherName && (
                      <span className="modern-error-message">{formErrors.fatherName}</span>
                    )}
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="parentNumber" className="modern-input-label">
                      Parent's Number <span className="modern-required">*</span>
                    </label>
                    <input
                      type="text"
                      id="parentNumber"
                      name="parentNumber"
                      value={student.parentNumber}
                      onChange={handleChange}
                      placeholder="Enter parent's number"
                      className={`modern-input ${formErrors.parentNumber ? "error" : ""}`}
                    />
                    {formErrors.parentNumber && (
                      <span className="modern-error-message">{formErrors.parentNumber}</span>
                    )}
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="alternativeNumber" className="modern-input-label">
                      Alternative Number
                    </label>
                    <input
                      type="text"
                      id="alternativeNumber"
                      name="alternativeNumber"
                      value={student.alternativeNumber}
                      onChange={handleChange}
                      placeholder="Enter alternative number"
                      className="modern-input"
                    />
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="adhaarNumber" className="modern-input-label">
                      Aadhaar Number <span className="modern-required">*</span>
                    </label>
                    <input
                      type="text"
                      id="adhaarNumber"
                      name="adhaarNumber"
                      value={student.adhaarNumber}
                      onChange={handleChange}
                      placeholder="Enter 12-digit Aadhaar number"
                      className={`modern-input ${formErrors.adhaarNumber ? "error" : ""}`}
                    />
                    {formErrors.adhaarNumber && (
                      <span className="modern-error-message">{formErrors.adhaarNumber}</span>
                    )}
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="place" className="modern-input-label">
                      Place <span className="modern-required">*</span>
                    </label>
                    <input
                      type="text"
                      id="place"
                      name="place"
                      value={student.place}
                      onChange={handleChange}
                      placeholder="Enter place of residence"
                      className={`modern-input ${formErrors.place ? "error" : ""}`}
                    />
                    {formErrors.place && (
                      <span className="modern-error-message">{formErrors.place}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Reference Details Section */}
              <div className="modern-form-section">
                <div className="modern-section-header">
                  <h3 className="modern-section-title">
                    <svg className="modern-section-icon" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12,3L2,12H5V20H19V12H22L12,3M12,7.7C14.1,7.7 15.8,9.4 15.8,11.5C15.8,14.5 12,18 12,18C12,18 8.2,14.5 8.2,11.5C8.2,9.4 9.9,7.7 12,7.7M12,10A1.5,1.5 0 0,0 10.5,11.5A1.5,1.5 0 0,0 12,13A1.5,1.5 0 0,0 13.5,11.5A1.5,1.5 0 0,0 12,10Z" />
                    </svg>
                    Reference Details
                  </h3>
                  <div className="modern-section-divider"></div>
                </div>
                <div className="modern-input-grid">
                  <div className="modern-input-group">
                    <label htmlFor="reference.userName" className="modern-input-label">
                      Reference Name <span className="modern-required">*</span>
                    </label>
                    <input
                      type="text"
                      id="reference.userName"
                      name="reference.userName"
                      value={student.reference?.userName || ""}
                      onChange={handleChange}
                      placeholder="Enter reference name"
                      className={`modern-input ${formErrors["reference.userName"] ? "error" : ""}`}
                    />
                    {formErrors["reference.userName"] && (
                      <span className="modern-error-message">{formErrors["reference.userName"]}</span>
                    )}
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="reference.consultancyName" className="modern-input-label">
                      Consultancy Name
                    </label>
                    <input
                      type="text"
                      id="reference.consultancyName"
                      name="reference.consultancyName"
                      value={student.reference?.consultancyName || ""}
                      onChange={handleChange}
                      placeholder="Enter consultancy name"
                      className="modern-input"
                    />
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="reference.totalSC" className="modern-input-label">
                      Total SC
                    </label>
                    <input
                      type="text"
                      id="reference.totalSC"
                      name="reference.totalSC"
                      value={student.reference?.totalSC || ""}
                      onChange={handleChange}
                      placeholder="Enter total SC"
                      className="modern-input"
                    />
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="reference.committedSC" className="modern-input-label">
                      Committed SC
                    </label>
                    <input
                      type="text"
                      id="reference.committedSC"
                      name="reference.committedSC"
                      value={student.reference?.committedSC || ""}
                      onChange={handleChange}
                      placeholder="Enter committed SC"
                      className="modern-input"
                    />
                  </div>
                </div>
              </div>

              {/* Academic Details Section */}
              <div className="modern-form-section">
                <div className="modern-section-header">
                  <h3 className="modern-section-title">
                    <svg className="modern-section-icon" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z" />
                    </svg>
                    Academic Details
                  </h3>
                  <div className="modern-section-divider"></div>
                </div>
                <div className="modern-input-grid">
                  <div className="modern-input-group">
                    <label htmlFor="plusTwoRegNumber" className="modern-input-label">
                      +2 Register Number
                    </label>
                    <input
                      type="text"
                      id="plusTwoRegNumber"
                      name="plusTwoRegNumber"
                      value={student.plusTwoRegNumber}
                      onChange={handleChange}
                      placeholder="Enter register number"
                      className="modern-input"
                    />
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="plusTwoSchoolName" className="modern-input-label">
                      +2 School Name
                    </label>
                    <input
                      type="text"
                      id="plusTwoSchoolName"
                      name="plusTwoSchoolName"
                      value={student.plusTwoSchoolName}
                      onChange={handleChange}
                      placeholder="Enter school name"
                      className="modern-input"
                    />
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="plusTwoSchoolPlace" className="modern-input-label">
                      School Place
                    </label>
                    <input
                      type="text"
                      id="plusTwoSchoolPlace"
                      name="plusTwoSchoolPlace"
                      value={student.plusTwoSchoolPlace}
                      onChange={handleChange}
                      placeholder="Enter school place"
                      className="modern-input"
                    />
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="lastQualification" className="modern-input-label">
                      Last Qualification
                    </label>
                    <select
                      id="lastQualification"
                      name="lastQualification"
                      value={student.lastQualification}
                      onChange={handleChange}
                      className="modern-input"
                    >
                      <option value="">Select Qualification</option>
                      <option value="SSLC">SSLC</option>
                      <option value="Plus Two">Plus Two</option>
                      <option value="Degree">Degree</option>
                      <option value="Diploma">Diploma</option>
                    </select>
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="lastQualificationMarks" className="modern-input-label">
                      Mark Percentage
                    </label>
                    <input
                      type="text"
                      id="lastQualificationMarks"
                      name="lastQualificationMarks"
                      value={student.lastQualificationMarks}
                      onChange={handleChange}
                      placeholder="Enter mark percentage"
                      className="modern-input"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Details Section */}
              <div className="modern-form-section">
                <div className="modern-section-header">
                  <h3 className="modern-section-title">
                    <svg className="modern-section-icon" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M5,6H23V18H5V6M14,9A3,3 0 0,1 17,12A3,3 0 0,1 14,15A3,3 0 0,1 11,12A3,3 0 0,1 14,9M9,8A2,2 0 0,1 7,10V14A2,2 0 0,1 9,16H19A2,2 0 0,1 21,14V10A2,2 0 0,1 19,8H9M1,10H3V20H19V22H1V10Z" />
                    </svg>
                    Payment Details
                  </h3>
                  <div className="modern-section-divider"></div>
                </div>
                <div className="modern-input-grid">
                  <div className="modern-input-group">
                    <label htmlFor="totalAmountPaid" className="modern-input-label">
                      Total Amount Paid
                    </label>
                    <input
                      type="text"
                      id="totalAmountPaid"
                      name="totalAmountPaid"
                      value={student.totalAmountPaid}
                      onChange={handleChange}
                      placeholder="Enter amount paid"
                      className="modern-input"
                    />
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="paidToCollege" className="modern-input-label">
                      Paid to College
                    </label>
                    <input
                      type="text"
                      id="paidToCollege"
                      name="paidToCollege"
                      value={student.paidToCollege}
                      onChange={handleChange}
                      placeholder="Enter amount paid to college"
                      className="modern-input"
                    />
                  </div>

                  <div className="modern-input-group">
                    <label htmlFor="paymentRemark" className="modern-input-label">
                      Payment Remarks
                    </label>
                    <textarea
                      id="paymentRemark"
                      name="paymentRemark"
                      value={student.paymentRemark}
                      onChange={handleChange}
                      placeholder="Enter payment remarks"
                      rows="3"
                      className="modern-textarea"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modern-form-actions">
              <button
                type="button"
                className="modern-secondary-btn"
                onClick={() => setCurrentStep(1)}
              >
                <svg className="modern-btn-icon" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
                </svg>
                Back to Verification
              </button>
              <button
                type="submit"
                className="modern-primary-btn"
                disabled={submissionStatus === "loading"}
              >
                {submissionStatus === "loading" ? (
                  <>
                    <svg className="modern-spinner" viewBox="0 0 50 50">
                      <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                    </svg>
                    Processing Enrollment...
                  </>
                ) : (
                  <>
                    <svg className="modern-btn-icon" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M17,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3M19,19H5V5H16.17L19,7.83V19M12,12A3,3 0 0,0 9,15A3,3 0 0,0 12,18A3,3 0 0,0 15,15A3,3 0 0,0 12,12M6,6H15V10H6V6Z" />
                    </svg>
                    Complete Enrollment
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        message={modalMessage}
      />
    </div>
  );
};

export default AddStudent;