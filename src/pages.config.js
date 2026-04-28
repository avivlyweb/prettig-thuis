import Home from './pages/Home';
import PatientDevice from './pages/PatientDevice';
import Routines from './pages/Routines';
import MemoryAlbum from './pages/MemoryAlbum';
import Caregiver from './pages/Caregiver';
import Videos from './pages/Videos';
import Privacy from './pages/Privacy';
import VoiceHome from './pages/VoiceHome';
import About from './pages/About';
import GoudenMomenten from './pages/GoudenMomenten';
import talk20 from './pages/Talk2_0';
import My3DHome from './pages/My3DHome';
import ICFUpload from './pages/ICFUpload';
import Gesprekspartner from './pages/Gesprekspartner';
import ICFInterviewDashboard from './pages/ICFInterviewDashboard';
import routines20 from './pages/Routines2_0';
import AdminQuestAudio from './pages/AdminQuestAudio';
import AdminKnowledgeBaseUpload from './pages/AdminKnowledgeBaseUpload';
import AdminKNGFUpload from './pages/AdminKNGFUpload';
import AdminICFCategoriesUpload from './pages/AdminICFCategoriesUpload';
import AdminFallPreventionUpload from './pages/AdminFallPreventionUpload';
import AdminTrainingDatasetUpload from './pages/AdminTrainingDatasetUpload';
import PatientDaySimulator from './pages/PatientDaySimulator';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "PatientDevice": PatientDevice,
    "Routines": Routines,
    "MemoryAlbum": MemoryAlbum,
    "Caregiver": Caregiver,
    "Videos": Videos,
    "Privacy": Privacy,
    "VoiceHome": VoiceHome,
    "About": About,
    "GoudenMomenten": GoudenMomenten,
    "Talk2_0": talk20,
    "My3DHome": My3DHome,
    "ICFUpload": ICFUpload,
    "Gesprekspartner": Gesprekspartner,
    "ICFInterviewDashboard": ICFInterviewDashboard,
    "Routines2_0": routines20,
    "AdminQuestAudio": AdminQuestAudio,
    "AdminKnowledgeBaseUpload": AdminKnowledgeBaseUpload,
    "AdminKNGFUpload": AdminKNGFUpload,
    "AdminICFCategoriesUpload": AdminICFCategoriesUpload,
    "AdminFallPreventionUpload": AdminFallPreventionUpload,
    "AdminTrainingDatasetUpload": AdminTrainingDatasetUpload,
    "PatientDaySimulator": PatientDaySimulator,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
