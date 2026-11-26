import { Toaster } from "sonner";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { AppRouter } from "@/app/router/AppRouter";

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
