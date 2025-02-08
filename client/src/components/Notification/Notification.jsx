import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Notification = () => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchTodayEvents = async () => {
      try {
        const { data } = await fetch("http://localhost:5000/api/events/today");
        setEvents(data);
      } catch (error) {
        console.error("Error fetching today's events:", error);
      }
    };

    fetchTodayEvents(); // Fetch immediately on mount

    const fetchInterval = setInterval(fetchTodayEvents, 5 * 60 * 1000); // Refresh every 5 min

    return () => clearInterval(fetchInterval);
  }, []); // ✅ Empty dependency to avoid infinite loop

  useEffect(() => {
    const notificationInterval = setInterval(() => {
      const currentTime = new Date().getTime();

      events.forEach((event) => {
        const eventTime = new Date(event.start).getTime();
        const diff = eventTime - currentTime;

        if (diff > 0 && diff <= 30 * 60 * 1000) {
          toast.info(`📅 Upcoming Event: ${event.title} in 30 minutes`, {
            autoClose: 5000,
          position: "bottom-right",
          closeOnClick:true,
          draggable:true
          });
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(notificationInterval);
  }, []); // ✅ Only runs when `events` changes

  return <ToastContainer position="bottom-right" autoClose={5000} />;
};

export default Notification;
