import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import chatRouter from "./chat";
import claimsRouter from "./claims";
import telegramRouter from "./telegram";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(chatRouter);
router.use(claimsRouter);
router.use(telegramRouter);

export default router;
