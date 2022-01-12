import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Charity {

    @PrimaryGeneratedColumn({type: 'integer'})
    charity_id: number;

    @Column({type: 'varchar', length: 50})
    name: string

    @Column({type: 'varchar', length: 50, unique: true})
    email: string

    @Column({type: 'varchar', length: 50, unique: true})
    username: string

    @Column({type: 'varchar', length: 256})
    password: string

    @Column({type: 'date', nullable: true})
    founded_in: string
    
    @Column({type: 'bool', nullable: true, default: false})
    verified: boolean
    
    @Column({type: 'varchar', length: 20, nullable: true})
    phone1: string

    @Column({type: 'varchar', length: 20, nullable: true})
    phone2: string

    @Column({type: 'text', nullable: true})
    meta_wallet_address: string

    @Column({type: 'integer', nullable: true})
    total_fundings: number

    @Column({type: 'integer', nullable: true})
    total_expenditure: number

    @Column({type: 'text', nullable: true})
    tax_exc_cert: string

    @Column({type: 'text', nullable: true, default: null})
    profile_image: string

}