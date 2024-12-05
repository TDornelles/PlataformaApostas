import { Request, Response, RequestHandler } from "express";
import { WalletHandler } from "../wallet/wallet";
import { EventsHandler } from "../events/events";

// Namespace para manuseio de apostas e eventos
export namespace BettingHandler {

    // Add at the top of the file with other imports
    interface Event {
        approval_status: number;
        betting_end_time: string;
        quotavalue: number;
    }

    /**
     * Função para o serviço "Apostar em evento"
     * @param req Requisição HTTP contendo email, eventId e amount
     * @param res Resposta HTTP
     */
    export const betOnEvent: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        const { email, eventId, amount } = req.body;

        // Basic parameter validation
        if (!email || !eventId || !amount || amount <= 0) {
            res.status(400).json({ error: "Parâmetros inválidos." });
            return;
        }

        try {
            const pool = require('../db/db');
            
            // Get event details
            const eventQuery = `
                SELECT approval_status, betting_end_time, quotavalue
                FROM Event 
                WHERE id = $1`;
            const eventResult = await pool.query(eventQuery, [eventId]);
            
            let shouldContinue = true;
            let quotas = 0;
            let event;

            if (eventResult.rows.length === 0) {
                res.status(404).json({ error: "Evento não encontrado." });
                shouldContinue = false;
            }

            if (shouldContinue) {
                event = eventResult.rows[0];

                // Validate event status and timing
                if (event.approval_status !== 2) {
                    res.status(400).json({ error: "Este evento não está disponível para apostas." });
                    shouldContinue = false;
                }
            }

            if (shouldContinue) {
                const bettingEndTime = new Date(event.betting_end_time);
                if (bettingEndTime < new Date()) {
                    res.status(400).json({ error: "O prazo para apostas neste evento já encerrou." });
                    shouldContinue = false;
                }
            }

            if (shouldContinue) {
                // Calculate quotas
                quotas = Math.floor(amount / event.quotavalue);
                if (quotas <= 0) {
                    res.status(400).json({ 
                        error: `O valor mínimo da aposta é R$ ${event.quotavalue.toFixed(2)}`
                    });
                    shouldContinue = false;
                }
            }

            // Create bet
            const insertBetQuery = `
                INSERT INTO Bet (event_id, email, quotas)
                VALUES ($1, $2, $3)
                RETURNING id`;
            
            const result = await pool.query(insertBetQuery, [eventId, email, quotas]);
            
            res.status(201).json({
                message: "Aposta realizada com sucesso!",
                betId: result.rows[0].id,
                quotas: quotas
            });

        } catch (error) {
            console.error("Erro ao processar aposta:", error);
            res.status(500).json({ error: "Erro ao processar a aposta." });
        }
    }

    /**
     * Função para buscar eventos por palavras-chave
     * @param req Requisição HTTP contendo o parâmetro de busca
     * @param res Resposta HTTP
     */
    export const searchEvent: RequestHandler = (req: Request, res: Response) => {
        const { keyword } = req.query;
    }
}
