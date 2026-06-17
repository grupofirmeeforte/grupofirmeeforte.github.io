export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Redirecionar para login customizado com ChaveJ
export const getLoginUrl = () => {
  return `${window.location.origin}/login`;
};
