import { Entity, PrimaryGeneratedColumn,  Column, Generated, OneToOne, JoinColumn, ManyToOne, OneToMany } from "typeorm";

export enum UserRole {
    ADMIN = "admin",
    CHARITY = "charity",
    DONER = "doner",
};

export enum CharityStatus {
    PENDING = "pending",
    VERIFIED = "verified",
    DECLINED = "declined",
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
    
    @Column({type: 'text', nullable: true})
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

    @OneToOne(() => CharityDetails, charityDetails => charityDetails.user)
    charityDetails: CharityDetails

    @OneToOne(() => Doners, doner => doner.user)
    doner: Doners
}

@Entity()
export class CharityDetails {

    @PrimaryGeneratedColumn({type: 'integer'})
    charity_id: number

    @OneToOne(type => User, user => user.charityDetails)
    @JoinColumn()
    user: User

    @Column({type: 'date', nullable: true})
    founded_in: string
    
    @Column({type: 'enum', enum: CharityStatus, default: CharityStatus.PENDING})
    verified: CharityStatus
    
    @Column({type: 'integer', nullable: true})
    total_fundings: number

    @Column({type: 'integer', nullable: true})
    total_expenditure: number

    @Column({type: 'text', nullable: true})
    tax_exc_cert: string
    
    @ManyToOne(() => Expense, expense => expense.charity)
    expenses: Expense
    
    @ManyToOne(() => Donation, donation => donation.charity)
    donations: Donation

}


@Entity()
export class Doners {

    @PrimaryGeneratedColumn({type: 'integer'})
    doner_id: number;

    @OneToOne(() => User, user => user.doner)
    @JoinColumn()
    user: User

    @Column({type: 'date', nullable: true})
    dob: string

    @Column({type: 'integer', nullable: true})
    total_donations: number

    @OneToMany(() => Donation, donation => donation.doner)
    donations: Donation

}

@Entity()
export class Expense {

    @PrimaryGeneratedColumn({type: 'integer'})
    expense_id: number;

    @ManyToOne(() => CharityDetails, charityDetails => charityDetails.expenses)
    charity: CharityDetails

    @Column({type: 'date', nullable: true, default: "now()"})
    date: Date = new Date()

    @Column({type: 'text', nullable: true})
    reason: string

    @Column({type: 'int', nullable: true})
    amount: number
}

@Entity()
export class Donation {
    
    @PrimaryGeneratedColumn({type: 'integer'})
    donation_id: number;
    
    @ManyToOne(() => CharityDetails, charityDetails => charityDetails.donations)
    charity: CharityDetails

    @ManyToOne(() => Doners, doner => doner.donations)
    doner: Doners
    
    @Column({type: 'date', nullable: true, default: "now()"})
    date: Date = new Date()

    @Column({type: 'int', nullable: true})
    amount: number
}
