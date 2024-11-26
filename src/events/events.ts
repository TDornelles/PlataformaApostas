import {Request, RequestHandler, Response} from "express";
import {connectToSSH} from  '../server';

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

    // Array para armazenar os eventos em lista de espera para aprovação
    let pendingEvents: Event[] = [];

    // Array para armazenar os eventos em lista de espera para aprovação
    let approvedEvents: Event[] = [];

    /**
     * Função para adicionar um novo evento à lista de espera.
     * @param event Evento do tipo @type {Event}
     * @returns O índice do evento adicionado
     */
    export function addEventToPendingList(event: Event): number {
        pendingEvents.push(event);
        return pendingEvents.length;
    }

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
            let query = `SELECT * FROM "Event" WHERE 1=1`; // Base da consulta

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
     * Função para deletar um evento com base no ID.
     * @param eventId ID do evento a ser deletado.
     * @returns Promise<boolean> Retorna verdadeiro se o evento foi deletado, falso caso contrário.
     */
    const deleteEvent = (eventId: number): Promise<boolean> => {
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
    export const evaluateNewEventRoute: RequestHandler = (req: Request, res: Response) => {
        const { id, approve } = req.body;

        // Validar se o ID é um número válido
        if (typeof id !== "number" || id <= 0 || id > pendingEvents.length) {
            res.status(400).send("ID inválido ou fora dos limites.");
            return;
        }

        const eventIndex = id - 1;
        const event = pendingEvents[eventIndex];

        if (approve === true) {
            // Aprovar evento e mover para a lista de eventos aprovados
            approvedEvents.push(event);
            pendingEvents.splice(eventIndex, 1);
            res.status(200).send(`Evento ID ${id} aprovado com sucesso.`);
        } else if (approve === false) {
            // Rejeitar evento e removê-lo da lista de pendentes
            pendingEvents.splice(eventIndex, 1);
            res.status(200).send(`Evento ID ${id} rejeitado e removido da lista de espera.`);
        } else {
            res.status(400).send("Parâmetro de aprovação inválido.");
        }
    };

}
