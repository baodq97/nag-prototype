import { StrictMode, Suspense, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import './index.css';
import { routes } from './routes';
import { Loading, Shell } from './ui/Shell';
import { NotFound } from './ui/NotFound';

const toRoute = (r: (typeof routes)[number]) => ({
  path: r.path,
  element: createElement(r.component),
});

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      ...routes.filter((r) => r.layout === 'console').map(toRoute),
      { path: '*', element: <NotFound /> },
    ],
  },
  // The auditor view and the trust page bring their own layouts.
  ...routes
    .filter((r) => r.layout !== 'console')
    .map((r) => ({
      path: r.path,
      element: <Suspense fallback={<Loading />}>{createElement(r.component)}</Suspense>,
    })),
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
