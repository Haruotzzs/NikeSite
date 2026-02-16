import { createContext, useEffect, useState, useContext } from "react";
import { Navigate } from "react-router-dom";

import { auth, db } from "../server/firebase";
import { getDataConnect } from "firebase/data-connect";

export const UserContext = createContext({
  user: undefined,
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(undefined);

  

  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;