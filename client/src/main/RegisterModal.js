import React from 'react';
import { Modal } from 'react-bootstrap';
import Register from '../components/RegisterComp';

const RegisterModal = ({ show, onHide }) => {
  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      centered
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>Register</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Register onClose={onHide} />
      </Modal.Body>
    </Modal>
  );
};

export default RegisterModal;