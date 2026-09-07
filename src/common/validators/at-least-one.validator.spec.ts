import { validate } from 'class-validator';
import { QueryUsersDTO } from '../../users/dto/query-users.dto';
import { ValidRoles } from '../../auth/interfaces/valid-roles';

describe('AtLeastOneConstraint', () => {
  it('should fail when no filter parameter is present', async () => {
    const dto = new QueryUsersDTO();

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(Object.keys(errors[0].constraints ?? {})).toContain('atLeastOne');
  });

  it('should pass when email is present', async () => {
    const dto = new QueryUsersDTO();
    dto.email = 'test@test.com';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass when active is present', async () => {
    const dto = new QueryUsersDTO();
    dto.active = true;

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass when roles is present', async () => {
    const dto = new QueryUsersDTO();
    dto.roles = ValidRoles.admin;

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass when createdAtFrom is present', async () => {
    const dto = new QueryUsersDTO();
    dto.createdAtFrom = '2024-01-01T00:00:00.000Z';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when only page and limit are present', async () => {
    const dto = new QueryUsersDTO();
    dto.page = 1;
    dto.limit = 10;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(Object.keys(errors[0].constraints ?? {})).toContain('atLeastOne');
  });
});
