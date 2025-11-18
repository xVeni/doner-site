import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Dish } from './dishes.entity';

@Injectable()
export class DishesService {
  constructor(
    @InjectRepository(Dish)
    private dishRepo: Repository<Dish>,
  ) {}

  private addFullImageUrl(dishes: Dish[] | Dish): any {
    const serverIP = process.env.IP_SERVER || 'localhost:5000';

    if (Array.isArray(dishes)) {
      return dishes.map(d => ({
        ...d,
        image: `http://${serverIP}/images/${d.image}`,
      }));
    }

    return {
      ...dishes,
      image: `http://${serverIP}/images/${dishes.image}`,
    };
  }

  async findAll(): Promise<Dish[]> {
    const dishes = await this.dishRepo.find();
    return this.addFullImageUrl(dishes);
  }

  async findFiltered(category?: number, search?: string, best_sell?: number): Promise<Dish[]> {
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.title = ILike(`%${search}%`);
    }

    if (best_sell){
      where.best_sell = 1
    }

    const dishes = await this.dishRepo.find({ where });
    return this.addFullImageUrl(dishes);
  }
}
