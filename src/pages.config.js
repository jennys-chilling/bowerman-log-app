import TrainingLog from './pages/TrainingLog';
import ShoeInventory from './pages/ShoeInventory';
import Account from './pages/Account';
import WeekTemplates from './pages/WeekTemplates';
import Workouts from './pages/Workouts';
import __Layout from './Layout.jsx';

export const PAGES = {
  TrainingLog,
  ShoeInventory,
  Account,
  WeekTemplates,
  Workouts,
};

export const pagesConfig = {
  mainPage: 'TrainingLog',
  Pages: PAGES,
  Layout: __Layout,
};
