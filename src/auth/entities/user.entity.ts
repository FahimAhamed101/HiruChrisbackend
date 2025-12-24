import { Exclude } from 'class-transformer';

export class User {
  id: string;
  email: string;
  phoneNumber?: string;
  
  @Exclude()
  password: string;
  
  rememberMe: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}