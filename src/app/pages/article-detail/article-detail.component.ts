import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Article } from '../../models/article.model';
import { ARTICLES } from '../../data/articles.data';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './article-detail.component.html',
  styleUrl: './article-detail.component.css',
})
export class ArticleDetailComponent {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  article: Article | null = null;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.article = ARTICLES.find(a => a.id === id) ?? null;
  }

  goBack(): void {
    this.router.navigate(['/articles']);
  }
}
