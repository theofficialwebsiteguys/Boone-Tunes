import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Product } from '../../models/product.model';
import { PRODUCTS } from '../../data/products.data';

@Component({
  selector: 'app-products',
  standalone: true,
  templateUrl: './products.component.html',
  styleUrl: './products.component.css',
})
export class ProductsComponent {
  private router = inject(Router);

  readonly products: Product[] = PRODUCTS;

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
