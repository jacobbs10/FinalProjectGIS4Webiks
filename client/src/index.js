import React from 'react';
import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import './index.css';
import App from './main/App';
//import Users from "./Users/Users";
//import AddUser from "./Users/AddUser";
//import Profile from "./Users/Profile";
import Home from "./pages/Home";
import NoPage from "./pages/NoPage";


export default function Main() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />                    
        </Route>        
        {/*<Route path="users" element={<Users />} />
        <Route path="userAct/user" element={<AddUser />} />
        <Route path="profile" element={<Profile />} />*/}
        {/*<Route path="userAct/user" element={<UserModal />} />*/}
        <Route path="*" element={<NoPage />} />
      </Routes>
    </BrowserRouter>
  );
}


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Main />);




// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
