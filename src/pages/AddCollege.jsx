import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import "../styles/AddCollege.css";

const CollegePage = () => {
  const [collegeName, setCollegeName] = useState("");
  const [courses, setCourses] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!collegeName.trim()) {
      toast.error("Please enter a college name.");
      setIsSubmitting(false);
      return;
    }

    const courseArray = courses
      .split(",")
      .map((course) => course.trim())
      .filter((course) => course);

    if (courseArray.length === 0) {
      toast.error("Please enter at least one course.");
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, "blr-college"), {
        name: collegeName,
        courses: courseArray,
        createdAt: new Date().toISOString()
      });

      toast.success("College added successfully!");
      setCollegeName("");
      setCourses("");
    } catch (error) {
      console.error("Error adding college:", error);
      toast.error("Failed to add college.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add_college_container">
      <div className="add_college_card">
        <div className="add_college_header">
          <h2 className="add_college_title">Add New College</h2>
          <p className="add_college_subtitle">Enter college details to add to the database</p>
        </div>
        
        <form onSubmit={handleSubmit} className="add_college_form">
          <div className="add_college_form_group">
            <label htmlFor="collegeName" className="add_college_label">
              College Name
              <span className="add_college_required">*</span>
            </label>
            <input
              type="text"
              id="collegeName"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="Enter college name"
              className="add_college_input"
            />
          </div>

          <div className="add_college_form_group">
            <label htmlFor="courses" className="add_college_label">
              Courses <span className="add_college_required">*</span>
              <span className="add_college_hint">(comma separated)</span>
            </label>
            <input
              type="text"
              id="courses"
              value={courses}
              onChange={(e) => setCourses(e.target.value)}
              placeholder="E.g., BCA, BBA, MCA"
              className="add_college_input"
            />
          </div>

          <button 
            type="submit" 
            className={`add_college_submit_btn ${isSubmitting ? 'add_college_submitting' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="add_college_spinner"></span>
                Adding...
              </>
            ) : (
              <>
                <svg className="add_college_icon" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                </svg>
                Add College
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CollegePage;