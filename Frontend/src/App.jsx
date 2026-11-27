import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { RouterProvider } from "react-router";
import { router } from "./app.routes.jsx";
import { AuthProvider } from "./features/auth/auth.context.jsx";
import { InterviewProvider } from "./features/interview/interview.context.jsx";
import { initSmoothScroll } from "./lib/smoothScroll.js";

function App() {
  useEffect(() => initSmoothScroll(), []);

  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <InterviewProvider>
          <RouterProvider router={router} />
        </InterviewProvider>
      </AuthProvider>
    </MotionConfig>
  );
}

export default App;
