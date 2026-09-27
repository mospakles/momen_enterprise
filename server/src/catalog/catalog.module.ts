import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CollectionsModule } from './collections/collections.module';
import { TagsModule } from './tags/tags.module';
import { CustomizationModule } from './customization/customization.module';
import { FabricsModule } from './fabrics/fabrics.module';
import { ColorSwatchesModule } from './color-swatches/color-swatches.module';
import { SizeOptionsModule } from './size-options/size-options.module';

@Module({
  imports: [
    ProductsModule,
    CategoriesModule,
    CollectionsModule,
    TagsModule,
    CustomizationModule,
    FabricsModule,
    ColorSwatchesModule,
    SizeOptionsModule,
  ],
  exports: [ProductsModule, CategoriesModule, CollectionsModule, FabricsModule],
})
export class CatalogModule {}
