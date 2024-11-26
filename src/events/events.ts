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
        const { title, description, quotaValue, bettingPeriod, eventDate, organizer } = req.body;
    
        // Validação dos parâmetros de entrada
        if (
            typeof title === "string" && title.length <= 50 &&
            typeof description === "string" && description.length <= 150 &&
            typeof quotaValue === "number" && quotaValue >= 1 &&
            bettingPeriod && typeof bettingPeriod.start === "string" && typeof bettingPeriod.end === "string" &&
            eventDate && typeof eventDate.day === "number" && typeof eventDate.month === "number" && typeof eventDate.year === "number" &&
            typeof organizer === "string"
        ) {
            const query = `
                INSERT INTO Event (title, description, quotaValue, bettingPeriodStart, bettingPeriodEnd, eventDateDay, eventDateMonth, eventDateYear, organizer)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id;
            `;
            const values = [
                title,
                description,
                quotaValue,
                bettingPeriod.start,
                bettingPeriod.end,
                eventDate.day,
                eventDate.month,
                eventDate.year,
                organizer
            ];
    
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

            // Condicional para filtrar pelo status
            if (status === "pending") {
                query += ` AND status = 'pending'`;  // Supondo que exista uma coluna status na tabela Event
            } else if (status === "approved") {
                query += ` AND status = 'approved' AND 
                            (eventDateYear > $1 OR 
                            (eventDateYear = $1 AND eventDateMonth > $2) OR 
                            (eventDateYear = $1 AND eventDateMonth = $2 AND eventDateDay >= $3))`;  // Filtra eventos aprovados futuros
            } else if (status === "past") {
                query += ` AND status = 'approved' AND 
                            (eventDateYear < $1 OR 
                            (eventDateYear = $1 AND eventDateMonth < $2) OR 
                            (eventDateYear = $1 AND eventDateMonth = $2 AND eventDateDay < $3))`;  // Filtra eventos aprovados passados
            } else {
                res.status(400).send("Status inválido. Use 'pending', 'approved' ou 'past'.");
                return;
            }

            // Parâmetros para evitar SQL injection
            const values = [today.getFullYear(), today.getMonth() + 1, today.getDate()];
            
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
     * Função para obter uma lista simplificada de eventos com apenas ID e título.
     * @returns Promise<Array<{id: number, title: string}>>
     */
     const getEventsList = async (): Promise<Array<{id: number, title: string}>> => {
        const query = 'SELECT id, title, approved FROM Event ORDER BY id';

        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error("Erro ao buscar lista de eventos:", error);
            throw new Error("Erro ao buscar lista de eventos.");
        }
    };

    /**
     * Função para tratar a rota HTTP /eventsList.
     * @param req Requisição HTTP do tipo @type {Request}
     * @param res Resposta HTTP do tipo @type {Response}
     */
    export const getEventsListRoute: RequestHandler = async (_req: Request, res: Response) => {
        try {
            const events = await getEventsList();
            res.status(200).json(events);
        } catch (error) {
            res.status(500).send("Erro ao buscar lista de eventos.");
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

        return pool.query(query, values)
            .then((result: { rowCount: number; }) => {
                // Verifica se algum evento foi deletado
                return result.rowCount > 0;
            })
            .catch((error: any) => {
                console.error("Erro ao tentar deletar o evento:", error);
                throw new Error("Erro ao deletar o evento.");
            });
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
          // Verificar se o evento existe na tabela de pendentes
          const pendingEventQuery = `SELECT * FROM Event WHERE id = $1`;
          const pendingEventResult = await pool.query(pendingEventQuery, [id]);
      
          if (pendingEventResult.rowCount === 0) {
            res.status(404).send(`Evento com ID ${id} não encontrado.`);
            return;
          }
      
          if (approve) {
            // Aprovar o evento
            const approveQuery = `UPDATE Event SET approved = TRUE WHERE id = $1`;
            await pool.query(approveQuery, [id]);
            res.status(200).send(`Evento com ID ${id} aprovado com sucesso.`);
          } else {
            // Rejeitar o evento
            const deleteQuery = `DELETE FROM Event WHERE id = $1`;
            await pool.query(deleteQuery, [id]);
            res.status(200).send(`Evento com ID ${id} rejeitado e removido.`);
          }
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
            SET status = 'finished', 
                finishedAt = CURRENT_TIMESTAMP 
            WHERE id = $1 
            AND status = 'approved' 
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

}
