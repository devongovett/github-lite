import {BrowserRouter} from 'react-router-dom';
import {createRoot} from 'react-dom/client';
import {App} from './App';

let root = createRoot(document.querySelector('#app')!);
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
