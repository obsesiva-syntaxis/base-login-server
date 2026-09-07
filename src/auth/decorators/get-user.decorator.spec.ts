import { InternalServerErrorException } from '@nestjs/common';
import { GetUser } from './get-user.decorator';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-empty-function
function getParamDecoratorFactory(decorator: Function) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  class TestDecorator {
    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    test(@decorator() _value: unknown) {}
  }
  const paramsMetadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestDecorator,
    'test',
  );
  const factory = paramsMetadata[Object.keys(paramsMetadata)[0]].factory;
  return factory;
}

describe('GetUser Decorator', () => {
  it('should return the full user when no data argument is passed', () => {
    const factory = getParamDecoratorFactory(GetUser);
    const mockUser = { id: 'uuid', email: 'test@test.com', roles: ['user'] };
    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    };
    const result = factory(null, mockCtx);
    expect(result).toEqual(mockUser);
  });

  it('should return a specific field when data argument is passed', () => {
    const factory = getParamDecoratorFactory(GetUser);
    const mockUser = { id: 'uuid', email: 'test@test.com', roles: ['user'] };
    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    };
    const result = factory('email', mockCtx);
    expect(result).toBe('test@test.com');
  });

  it('should throw InternalServerErrorException if user is not on request', () => {
    const factory = getParamDecoratorFactory(GetUser);
    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: undefined }),
      }),
    };
    expect(() => factory(null, mockCtx)).toThrow(InternalServerErrorException);
  });
});
