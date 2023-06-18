import { IsJWT, IsUUID } from "class-validator";

export class VerifyUserDTO {
    @IsJWT()
    token: string;

    @IsUUID()
    userId: string;
}