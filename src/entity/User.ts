import { Entity, PrimaryGeneratedColumn,  Column, Generated, OneToOne, JoinColumn } from "typeorm";

export enum UserRole {
    ADMIN = "admin",
    CHARITY = "charity",
    DONER = "doner",
};

export abstract class Tokens {
    public static blackListedTokens = [];
}

@Entity()
export class User {

    @PrimaryGeneratedColumn({type: 'integer'})
    user_id: number

    @Column()
    @Generated("uuid")
    public_id: string

    @Column({type: 'varchar', length: 50})
    name: string

    @Column({type: 'varchar', length: 50, unique: true})
    email: string

    @Column({type: 'varchar', length: 50, unique: true})
    username: string

    @Column({type: 'varchar', length: 256})
    password: string
    
    @Column({type: 'varchar', length: 256, nullable: true})
    description: string

    @Column({type: 'enum', enum: UserRole, default: UserRole.DONER})
    userRole: UserRole

    @Column({type: 'varchar', length: 20, nullable: true})
    phone1: string

    @Column({type: 'varchar', length: 20, nullable: true})
    phone2: string

    @Column({type: 'text', nullable: true})
    meta_wallet_address: string

    @Column({type: 'text', nullable: true, default: null})
    profile_image: string

    @Column({type: 'date', nullable: true, default: "now()"})
    joined_time: Date = new Date()

    @OneToOne(() => CharityDetails)
    @JoinColumn()
    charityDetails: CharityDetails

    @OneToOne(() => Doners)
    @JoinColumn()
    doners: Doners

}

@Entity()
export class CharityDetails {

    @PrimaryGeneratedColumn({type: 'integer'})
    charity_id: number

    @OneToOne(type => User)
    @JoinColumn()
    user: User

    @Column({type: 'date', nullable: true})
    founded_in: string
    
    @Column({type: 'bool', nullable: true, default: false})
    verified: boolean
    
    @Column({type: 'integer', nullable: true})
    total_fundings: number

    @Column({type: 'integer', nullable: true})
    total_expenditure: number

    @Column({type: 'text', nullable: true})
    tax_exc_cert: string
}


@Entity()
export class Doners {

    @PrimaryGeneratedColumn({type: 'integer'})
    doner_id: number;

    @OneToOne(type => User)
    @JoinColumn()
    user: User

    @Column({type: 'date', nullable: true})
    dob: string

    @Column({type: 'integer', nullable: true})
    total_donations: number

}
