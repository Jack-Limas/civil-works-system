import { userRepository } from "../repositories/user.repository";
import { Role } from "../types/auth";

export const userService = {
  list(role?: Role) {
    return userRepository.findAllPublic(role);
  },
};
