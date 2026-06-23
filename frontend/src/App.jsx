import { routes } from "./routes";

export function App() {
  const currentPath = window.location.pathname;
  const route = routes.find((item) => item.path === currentPath) || routes[0];
  const Page = route.component;

  return <Page />;
}
