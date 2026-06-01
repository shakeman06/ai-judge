import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ImportPage from "./pages/ImportPage";
import JudgesPage from "./pages/JudgesPage";
import QueuesPage from "./pages/QueuesPage";
import ResultsPage from "./pages/ResultsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ImportPage />} />
          <Route path="/judges" element={<JudgesPage />} />
          <Route path="/queues" element={<QueuesPage />} />
          <Route path="/queues/:queueId" element={<QueuesPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
