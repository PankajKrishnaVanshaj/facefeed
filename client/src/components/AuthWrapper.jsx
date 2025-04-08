import AuthForm from "./AuthForm";

// AuthWrapper component
const AuthWrapper = ({ token, Component }) => {
  return token ? <Component /> : <AuthForm />;
};

export default AuthWrapper;
