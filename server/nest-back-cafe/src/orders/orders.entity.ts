import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string; // delivery | pickup

  @Column()
  address: string;

  @Column({ nullable: true })
  comment: string;

  @Column()
  paymentMethod: string;

  @Column()
  customer_name: string;

  @Column()
  phone: string; // лучше string

  @Column('jsonb')
  items: { id_dishes: number; title: string; quantity: number; }[];

  @Column('decimal')
  total: number;

  @Column({ default: false })
  need_callback: boolean;

  @Column({ nullable: true })
  change_amount: string; // null если не нужен

  @Column()
  time: string; // строка времени

  @Column()
  Email: string; // Эл-почта

  @Column({ default: 'new' })
  status: string;

    @Column({ default: 'pending' })
  status_tgBot: string; // pending | completed

  @CreateDateColumn()
  created_at: Date;

}
