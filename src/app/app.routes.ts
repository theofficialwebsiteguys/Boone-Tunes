import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/auth-callback/auth-callback.component').then(m => m.AuthCallbackComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'playlist/:id',
    loadComponent: () =>
      import('./pages/playlist-detail/playlist-detail.component').then(m => m.PlaylistDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'player',
    loadComponent: () =>
      import('./pages/player/player.component').then(m => m.PlayerComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'bt-playlist/:id',
    loadComponent: () =>
      import('./pages/bt-playlist-detail/bt-playlist-detail.component').then(m => m.BtPlaylistDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'explore',
    loadComponent: () =>
      import('./pages/explore/explore.component').then(m => m.ExploreComponent),
    canActivate: [authGuard]
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./pages/products/products.component').then(m => m.ProductsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'articles',
    loadComponent: () =>
      import('./pages/articles/articles.component').then(m => m.ArticlesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'articles/:id',
    loadComponent: () =>
      import('./pages/article-detail/article-detail.component').then(m => m.ArticleDetailComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '' }
];
