import React from 'react';
import { Modal } from 'react-bootstrap';
import Login from '../components/LoginComp';

const LoginModal = ({ show, onHide, onLoginSuccess }) => {
  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      centered
      backdrop="static"
      keyboard={false}
      style={{ zIndex: 1050 }} 
    >
      <Modal.Header closeButton>
        <Modal.Title>Login</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Login onClose={onHide} onLoginSuccess={onLoginSuccess} />
      </Modal.Body>
    </Modal>
  );
};

export default LoginModal;