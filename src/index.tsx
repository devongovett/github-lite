import {BrowserRouter} from 'react-router-dom';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import {login} from './client';

if (!localStorage.token) {
  login();
} else {
  let root = createRoot(document.querySelector('#app')!);
  root.render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
