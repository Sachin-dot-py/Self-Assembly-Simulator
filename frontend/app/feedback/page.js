'use client'

import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import { FaUser, FaEnvelope, FaUniversity, FaBriefcase, FaCommentDots, FaCheckCircle } from 'react-icons/fa';
import './feedback.css';

const FeedbackForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    role: '',
    feedback: ''
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdP9eIKvGntL5LO3ks2C2yWjeWDXirO3kDN9W8dM_E7-J9UUw/formResponse";

    const formDataToSend = new FormData();
    formDataToSend.append('entry.1996693180', formData.name);
    formDataToSend.append('entry.1787364605', formData.email);
    formDataToSend.append('entry.1699838940', formData.institution);
    formDataToSend.append('entry.797672024', formData.role);
    formDataToSend.append('entry.1598697395', formData.feedback);
    formDataToSend.append('fvv', '1');
    formDataToSend.append('fbzx', '-7308821587133511674');
    formDataToSend.append('pageHistory', '0');

    try {
      await fetch(formUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: formDataToSend
      });
      setMessage('Thanks for submitting feedback! We appreciate it.');
      setFormData({ name: '', email: '', institution: '', role: '', feedback: '' });
    } catch (error) {
      setMessage('Error submitting feedback. Please try again.');
    }
  };

  return (
    <>
      <Navigation />
      <title>Submit Feedback</title>
      <center>
        <div className="form-container">
          <h2><FaCommentDots className="icon" /> Submit Feedback</h2>
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="input-group">
              <FaUser className="icon" />
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="input-group">
              <FaEnvelope className="icon" />
              <input
                type="email"
                name="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="input-group">
              <FaUniversity className="icon" />
              <input
                type="text"
                name="institution"
                placeholder="Your Institution"
                value={formData.institution}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="input-group">
              <FaBriefcase className="icon" />
              <input
                type="text"
                name="role"
                placeholder="Your Role"
                value={formData.role}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="input-group">
              <FaCommentDots className="icon" />
              <textarea
                name="feedback"
                placeholder="Your Feedback"
                value={formData.feedback}
                onChange={handleChange}
                className="form-textarea"
                required
              />
            </div>
            <button type="submit" className="submit-button">Submit</button>
          </form>
          {message && <p className="form-message"><FaCheckCircle className="icon" /> {message}</p>}
        </div>
      </center>
    </>
  );
};

export default FeedbackForm;