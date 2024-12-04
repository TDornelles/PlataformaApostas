import {Request, RequestHandler, Response} from "express";

export namespace EventsHandler {

        /**
     * Tipo Event, representando um evento aguardando aprovação.
     */
    export type Event = {
        title: string;
        description: string;
        quotaValue: number;
        bettingPeriod: {
            start: string; // Data-hora início no formato ISO
            end: string;   // Data-hora fim no formato ISO
        };
        eventDate: {
            day: number;
            month: number;
            year: number;
        };
        organizer: string;
    };

    const pool = require('../db/db');


/**
 * Função para tratar a rota HTTP /addNewEvent.
 * @param req Requisição HTTP do tipo @type {Request}
 * @param res Resposta HTTP do tipo @type {Response}
 */
export const addNewEventRoute: RequestHandler = async (req, res) => {
    const { title, description, organizer, quotaValue } = req.body;

    // Validação dos parâmetros de entrada
    if (
        typeof title === "string" && title.length <= 255 &&
        typeof description === "string" && description.length <= 255 &&
        typeof organizer === "string" && organizer.includes("@") &&
        typeof quotaValue === "number" && quotaValue > 0
    ) {
        const query = `
            INSERT INTO Event (title, description, organizer, quotaValue)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
        const values = [title, description, organizer, quotaValue];

        try {
            // Inserção no banco de dados
            const result = await pool.query(query, values);
            const newEventId = result.rows[0].id;

            res.status(200).send(`Novo evento adicionado com sucesso. Código: ${newEventId}`);
        } catch (error) {
            console.error("Erro ao inserir evento no banco de dados:", error);
            res.status(500).send("Erro ao adicionar o evento no banco de dados.");
        }
    } else {
        res.status(400).send("Parâmetros inválidos ou faltantes.");
    }
};


    
    /**
     * Função para tratar a rota HTTP /getEvents.
     * @param req Requisição HTTP do tipo @type {Request}
     * @param res Resposta HTTP do tipo @type {Response}
     */
    export const getEventsRoute: RequestHandler = async (req: Request, res: Response) => {
        const { status } = req.query; // status pode ser 'pending', 'approved' ou 'past'
        const today = new Date();
        
        try {
            let query = `SELECT * FROM Event WHERE 1=1`; // Base da consulta
            let values: any[] = [];

            // Condicional para filtrar pelo status
            if (status === "pending") {
                query += ` AND approval_status = 1`;  // Status pendente
            } else if (status === "approved") {
                query += ` AND approval_status = 2 AND 
                            (eventDateYear > $1 OR 
                            (eventDateYear = $1 AND eventDateMonth > $2) OR 
                            (eventDateYear = $1 AND eventDateMonth = $2 AND eventDateDay >= $3))`;
                values = [today.getFullYear(), today.getMonth() + 1, today.getDate()];
            } else if (status === "past") {
                query += ` AND approval_status = 2 AND 
                            (eventDateYear < $1 OR 
                            (eventDateYear = $1 AND eventDateMonth < $2) OR 
                            (eventDateYear = $1 AND eventDateMonth = $2 AND eventDateDay < $3))`;
                values = [today.getFullYear(), today.getMonth() + 1, today.getDate()];
            } else if (status === "denied") {
                query += ` AND approval_status = 3`;  // Status negado
            } else {
                res.status(400).send("Status inválido. Use 'pending', 'approved', 'denied' ou 'past'.");
                return;
            }
            
            // Executar a consulta SQL
            const result = await pool.query(query, values);

            // Retorna os eventos filtrados
            res.status(200).json(result.rows);
        } catch (error) {
            console.error("Erro ao acessar eventos:", error);
            res.status(500).send("Erro ao acessar eventos no banco de dados.");
        }
    };

    /**
     * Função para retornar a lista de eventos.
     * @param req Requisição HTTP do tipo @type {Request}
     * @param res Resposta HTTP do tipo @type {Response}
     */
    export const getEventsListRoute: RequestHandler = async (req: Request, res: Response) => {
        try {
            // Consulta SQL para pegar os eventos com ordem explícita
            const query = `
                SELECT 
                    id,
                    title,
                    description,
                    approval_status,
                    updated_at,
                    quotaValue,
                    organizer,
                    betting_end_time
                FROM Event
                ORDER BY updated_at DESC
                LIMIT 100;  -- Protege contra sobrecarga de dados
            `;

            const result = await pool.query(query);
            res.status(200).json(result.rows || []);  // Simplifica a lógica do retorno

        } catch (error) {
            console.error("Erro ao acessar eventos:", error);
            // Verifica se é um erro conhecido do PostgreSQL
            if (error instanceof Error) {
                res.status(500).json({
                    error: "Erro ao acessar eventos no banco de dados",
                    message: error.message
                });
            } else {
                res.status(500).json({
                    error: "Erro interno do servidor"
                });
            }
        }
    };

        /**
     * Função para deletar um evento com base no ID.
     * @param eventId ID do evento a ser deletado.
     * @returns Promise<boolean> Retorna verdadeiro se o evento foi deletado, falso caso contrário.
     */
    const deleteEvent = async (eventId: number): Promise<boolean> => {
        const query = "DELETE FROM Event WHERE id = $1 RETURNING id";
        const values = [eventId];

        try {
            const result = await pool.query(query, values);
            return result.rowCount > 0;
        } catch (error) {
            console.error("Erro ao tentar deletar o evento:", error);
            throw new Error("Erro ao deletar o evento.");
        }
    };


    /**
     * Função para tratar a rota HTTP /deleteEvent.
     * @param req Requisição HTTP do tipo @type {Request}
     * @param res Resposta HTTP do tipo @type {Response}
     */
    export const deleteEventRoute = (req: Request, res: Response): void => {
        const { eventId } = req.body; // Recebe apenas o eventId no corpo da requisição

        if (!eventId) {
            res.status(400).send("O ID do evento é obrigatório.");
            return; 
        }

        // Chama a função para deletar o evento e processa a resposta
        deleteEvent(eventId)
            .then(success => {
                if (success) {
                    res.status(200).send(`Evento com ID ${eventId} deletado com sucesso.`);
                } else {
                    res.status(404).send("Evento não encontrado.");
                }
            })
            .catch(error => {
                res.status(500).send("Erro desconhecido ao tentar deletar o evento.");
            });
    };


    /**
     * Função para avaliar um evento e decidir se será aprovado ou rejeitado.
     * @param req Requisição HTTP do tipo @type {Request}
     * @param res Resposta HTTP do tipo @type {Response}
     */
    export const evaluateNewEventRoute: RequestHandler = async (req: Request, res: Response) => {
        const { id, approve } = req.body;

        // Validar se o ID é um número válido
        if (typeof id !== "number" || id <= 0) {
            res.status(400).send("ID inválido.");
            return;
        }

        // Validar se approve é booleano
        if (typeof approve !== "boolean") {
            res.status(400).send("O campo 'approve' deve ser um booleano.");
            return;
        }

        try {
            // Verificar se o evento existe na tabela
            const eventQuery = `SELECT * FROM Event WHERE id = $1`;
            const eventResult = await pool.query(eventQuery, [id]);

            if (eventResult.rowCount === 0) {
                res.status(404).send(`Evento com ID ${id} não encontrado.`);
                return;
            }

            // Atualizar o status de aprovação
            const newStatus = approve ? 2 : 3; // 2 = approved, 3 = denied
            console.log(newStatus);
            const updateStatusQuery = `UPDATE Event SET approval_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
            if (newStatus === 2) {
                // Atualizar o betting_start_time e betting_end_time
                const updateBettingTimesQuery = `
                    UPDATE Event 
                    SET betting_start_time = CURRENT_TIMESTAMP,
                        betting_end_time = CURRENT_TIMESTAMP + INTERVAL '1 month' 
                    WHERE id = $1`;
                await pool.query(updateBettingTimesQuery, [id]);
            }
            await pool.query(updateStatusQuery, [newStatus, id]);

            const statusMessage = approve ? "aprovado" : "rejeitado";
            res.status(200).send(`Evento com ID ${id} ${statusMessage} com sucesso.`);
        } catch (error) {
            console.error("Erro ao avaliar evento:", error);
            res.status(500).send("Erro ao processar a solicitação.");
        }
    };

    /**
     * Função para finalizar um evento e atualizar seu status.
     * @param eventId ID do evento a ser finalizado
     * @returns Promise<boolean> Retorna verdadeiro se o evento foi finalizado com sucesso
     */
    const finishEvent = async (eventId: number): Promise<boolean> => {
        const query = `
            UPDATE Event 
            SET approval_status = 4,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 
            AND approval_status = 2
            RETURNING id`;
        const values = [eventId];

        try {
            const result = await pool.query(query, values);
            return result.rowCount > 0;
        } catch (error) {
            console.error("Erro ao tentar finalizar o evento:", error);
            throw new Error("Erro ao finalizar o evento.");
        }
    };


    /**
     * Função para tratar a rota HTTP /finishEvent.
     * @param req Requisição HTTP do tipo @type {Request}
     * @param res Resposta HTTP do tipo @type {Response}
     */
    export const finishEventRoute: RequestHandler = async (req: Request, res: Response) => {
        const { eventId } = req.body;

        if (!eventId) {
            res.status(400).send("O ID do evento é obrigatório.");
            return;
        }

        // Atualizar o tempo final de apostas para o momento atual
        try {
            await updateBettingEndTime(eventId, new Date());
        } catch (error) {
            console.error("Erro ao atualizar tempo final de apostas:", error);
        }

        try {
            const success = await finishEvent(eventId);
            if (success) {
                res.status(200).send(`Evento com ID ${eventId} finalizado com sucesso.`);
            } else {
                res.status(404).send("Evento não encontrado ou não está aprovado.");
            }
        } catch (error) {
            res.status(500).send("Erro ao tentar finalizar o evento.");
        }
    };

    /**
     * Função para atualizar o tempo final de apostas de um evento.
     * @param eventId ID do evento
     * @param endTime Nova data/hora final para apostas
     * @returns Promise<boolean> Verdadeiro se atualizado com sucesso
     */
    const updateBettingEndTime = async (eventId: number, endTime: Date): Promise<boolean> => {
        const query = `
            UPDATE Event 
            SET betting_end_time = $1 
            WHERE id = $2 
            AND approval_status = 2
            RETURNING id`;
        
        try {
            const result = await pool.query(query, [endTime.toISOString(), eventId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error("Erro ao atualizar tempo final de apostas:", error);
            throw new Error("Erro ao atualizar tempo final de apostas.");
        }
    };

    export const updateBettingEndTimeRoute: RequestHandler = async (req: Request, res: Response) => {
        const { eventId, endTime } = req.body;

        // Validação dos parâmetros
        if (!eventId || typeof eventId !== "number") {
            res.status(400).send("ID do evento inválido ou não fornecido.");
            return;
        }

        // Validar o formato da data
        const endTimeDate = new Date(endTime);
        if (isNaN(endTimeDate.getTime())) {
            res.status(400).send("Data de término inválida. Use o formato ISO (ex: '2024-03-25T10:00:00Z')");
            return;
        }

        // Verificar se a data não está no passado
        if (endTimeDate < new Date()) {
            res.status(400).send("A data de término não pode estar no passado.");
            return;
        }

        try {
            const success = await updateBettingEndTime(eventId, endTimeDate);
            if (success) {
                res.status(200).json({
                    message: `Tempo final de apostas atualizado para o evento ${eventId}.`,
                    endTime: endTimeDate.toISOString()
                });
            } else {
                res.status(404).send("Evento não encontrado ou não está aprovado.");
            }
        } catch (error) {
            res.status(500).send("Erro ao processar a solicitação.");
        }
    };

}
