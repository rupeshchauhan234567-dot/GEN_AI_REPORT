
import {
    getAllInterviewReports,
    generateInterviewReport,
    getInterviewReportById,
    generateResumePdf,
    deleteInterviewReport as deleteInterviewReportApi
} from "../services/interview.api";

import {
    useCallback,
    useContext,
    useEffect
} from "react";

import { InterviewContext } from "../interview.context.js";
import { useParams } from "react-router";

export const useInterview = () => {
    const context = useContext(InterviewContext);
    const { interviewId } = useParams();

    if (!context) {
        throw new Error(
            "useInterview must be used within an InterviewProvider"
        );
    }

    const {
        loading,
        setLoading,
        report,
        setReport,
        reports,
        setReports
    } = context;

    // GENERATE INTERVIEW REPORT
    const generateReport = async ({
        jobDescription,
        selfDescription,
        resumeFile
    }) => {
        const jd = String(jobDescription || "").trim();
        const sd = String(selfDescription || "").trim();

        if (!jd) {
            throw new Error("Please enter the job description.");
        }

        if (jd.length > 20000) {
            throw new Error(
                "Job description cannot exceed 20,000 characters."
            );
        }

        if (!sd) {
            throw new Error("Please enter your self-description.");
        }

        if (!resumeFile) {
            throw new Error("Please upload your resume.");
        }

        setLoading(true);

        try {
            const response = await generateInterviewReport({
                jobDescription: jd,
                selfDescription: sd,
                resumeFile
            });

            const interviewReport =
                response?.interviewReport ?? null;

            setReport(interviewReport);

            return interviewReport;
        } catch (error) {
            console.error(
                "Generate Report Error:",
                error.response?.data || error.message
            );

            throw error;
        } finally {
            setLoading(false);
        }
    };

    // GET ALL REPORTS
    const getReports = useCallback(async () => {
        setLoading(true);

        try {
            const response = await getAllInterviewReports();

            const interviewReports =
                response?.interviewReports ?? [];

            setReports(interviewReports);

            return interviewReports;
        } catch (error) {
            console.error(
                "Get Reports Error:",
                error.response?.data || error.message
            );

            setReports([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, [setLoading, setReports]);

    // GET REPORT BY ID
    const getReportById = useCallback(async (id) => {
        if (!id) return null;

        setLoading(true);

        try {
            const response = await getInterviewReportById(id);

            const interviewReport =
                response?.interviewReport ?? null;

            setReport(interviewReport);

            return interviewReport;
        } catch (error) {
            console.error(
                "Get Report By ID Error:",
                error.response?.data || error.message
            );

            setReport(null);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [setLoading, setReport]);

    // DELETE REPORT
    const deleteReport = async (id) => {
        try {
            await deleteInterviewReportApi(id);

            setReports(currentReports =>
                currentReports.filter(
                    item => item._id !== id
                )
            );

            return true;
        } catch (error) {
            console.error(
                "Delete Report Error:",
                error.response?.data || error.message
            );

            throw error;
        }
    };

    // DOWNLOAD RESUME PDF
    const getResumePdf = async (
        interviewReportId,
        openedWindow = null
    ) => {
        try {
            const response = await generateResumePdf({
                interviewReportId
            });

            if (!(response instanceof Blob)) {
                throw new Error(
                    "Invalid PDF response received from server."
                );
            }

            if (
                response.size === 0 ||
                response.type === "application/json" ||
                response.type === "text/html"
            ) {
                throw new Error(
                    "Server did not generate a valid PDF."
                );
            }

            const pdfBlob = new Blob(
                [response],
                { type: "application/pdf" }
            );

            const pdfHeader = await pdfBlob.slice(0, 5).text();

            if (pdfHeader !== "%PDF-") {
                throw new Error(
                    "The downloaded file is not a valid PDF."
                );
            }

            const url = window.URL.createObjectURL(pdfBlob);

            const isIOS =
                /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (
                    navigator.platform === "MacIntel" &&
                    navigator.maxTouchPoints > 1
                );

            if (isIOS) {
                const target =
                    openedWindow && !openedWindow.closed
                        ? openedWindow
                        : window;

                target.location.href = url;

                window.setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                }, 60000);

                return true;
            }

            const link = document.createElement("a");

            link.href = url;
            link.download =
                `InterviewAI_Resume_${interviewReportId}.pdf`;

            link.rel = "noopener";

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 60000);

            if (openedWindow && !openedWindow.closed) {
                openedWindow.close();
            }

            return true;
        } catch (error) {
            if (openedWindow && !openedWindow.closed) {
                openedWindow.close();
            }

            console.error(
                "Resume PDF download failed:",
                error.message
            );

            throw error;
        }
    };

    // FETCH REPORTS ON PAGE LOAD
    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId).catch(() => {});
        } else {
            getReports();
        }
    }, [interviewId, getReportById, getReports]);

    // RETURN
    return {
        loading,
        report,
        reports,
        generateReport,
        getReportById,
        getReports,
        getResumePdf,
        deleteReport
    };
};
