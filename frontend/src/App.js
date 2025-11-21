import { jsx as _jsx } from "react/jsx-runtime";
import HomePage from './pages/HomePage';
import { useTelegram } from './hooks/useTelegram';
function App() {
    useTelegram();
    return _jsx(HomePage, {});
}
export default App;
