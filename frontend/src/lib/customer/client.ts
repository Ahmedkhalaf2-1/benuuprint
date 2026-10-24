import { createApiClient } from "@/lib/api/client";
import { customerAuthRoutes } from "@/lib/config/env";
import { customerTokenStore, emitCustomerSessionExpired } from "./session";

/** API client for `/customer/*`: customer token only, customer refresh route only. Never sends or accepts a staff token. */
const customer = createApiClient({ tokenStore: customerTokenStore, refreshUrl: customerAuthRoutes.refresh, onExpired: emitCustomerSessionExpired });
export const customerApi = customer.api;
export const refreshCustomerToken = customer.refreshAccessToken;
