import TrainingLog from './pages/TrainingLog';
import ShoeInventory from './pages/ShoeInventory';
import __Layout from './Layout.jsx';

export const PAGES = {
  TrainingLog,
  ShoeInventory,
};

export const pagesConfig = {
  mainPage: 'TrainingLog',
  Pages: PAGES,
  Layout: __Layout,
};
