import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Article } from '../../models/article.model';
import { ARTICLES } from '../../data/articles.data';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.css',
})
export class ArticlesComponent {
  private router = inject(Router);

  readonly articles: Article[] = ARTICLES;

  openArticle(id: string): void {
    this.router.navigate(['/articles', id]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
