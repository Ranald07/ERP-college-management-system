import { createContext, useContext, useState } from "react";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const token  = localStorage.getItem("erp_token");
    const role   = localStorage.getItem("erp_role");
    const name   = localStorage.getItem("erp_name");
    const roleId = localStorage.getItem("erp_roleId");
    const userId = localStorage.getItem("erp_userId");
    return token ? { token, role, name, roleId: Number(roleId), userId: Number(userId) } : null;
  });

  const login = (data) => {
    localStorage.setItem("erp_token",  data.token);
    localStorage.setItem("erp_role",   data.role);
    localStorage.setItem("erp_name",   data.name);
    localStorage.setItem("erp_roleId", data.roleId  ?? "");
    localStorage.setItem("erp_userId", data.userId  ?? "");
    setAuth({
      token:  data.token,
      role:   data.role,
      name:   data.name,
      roleId: data.roleId,
      userId: data.userId,
    });
  };

  const logout = () => {
    localStorage.clear();
    setAuth(null);
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
