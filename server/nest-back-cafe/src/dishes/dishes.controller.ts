import { Controller, Get, Query } from '@nestjs/common';
import { DishesService } from './dishes.service';
import { Dish } from './dishes.entity';

@Controller('dishes')
export class DishesController {
  constructor(private readonly dishesService: DishesService) {}
@Get()
  getAll(
    @Query('category') category?: number,
    @Query('search') search?: string,
  ): Promise<Dish[]> {
    return this.dishesService.findFiltered(category, search);
  }
}