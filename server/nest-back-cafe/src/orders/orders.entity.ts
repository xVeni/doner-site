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
  items: { id_dishes: number; title: string; quantity: number; price: number }[];

  @Column('decimal')
  total: number;

  @Column({ default: false })
  need_callback: boolean;

  @Column({ nullable: true })
  change_amount: string; // null если не нужен

  @Column()
  time: string; // строка времени

  @Column()
  email: string; // Эл-почта

  @Column({ default: 'new' })
  status: string;

    @Column({ default: 'В ожидании' })
  status_tgBot: string; // pending | completed

  @Column({nullable: true})
  deliveryPrice: string;

  
  @Column({ nullable: true })
  payment_id:string;

  @Column({ nullable: true })
  payment_url:string;

  @CreateDateColumn()
  created_at: Date;

   @Column({ type: 'boolean', default: false })
  is_paid: boolean;

  @Column({ type: 'bigint', nullable: true })
telegram_message_id: string | null;


}
