import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Doners {

    @PrimaryGeneratedColumn({type: 'integer'})
    doner_id: number;

    @Column({type: 'varchar', length: 50})
    name: string

    @Column({type: 'varchar', length: 50, unique: true})
    email: string

    @Column({type: 'varchar', length: 50, unique: true})
    username: string

    @Column({type: 'varchar', length: 256})
    password: string

    @Column({type: 'date', nullable: true})
    dob: string

    @Column({type: 'varchar', length: 20, nullable: true})
    phone1: string

    @Column({type: 'varchar', length: 20, nullable: true})
    phone2: string

    @Column({type: 'text', nullable: true})
    meta_wallet_address: string

    @Column({type: 'integer', nullable: true})
    total_donations: number

    @Column({type: 'text', nullable: true, default: null})
    profile_image: string

}