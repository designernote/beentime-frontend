import React, { useState, useEffect } from 'react';
/** @jsxImportSource @emotion/react */
import * as S from '../AttendanceEventPage/Style';
import mainLogo from '../../Img/main_logo.svg';
import tableImage from '../../Img/table1.svg'; // 테이블 이미지
import editLogo from '../../Img/edit_logo.svg';
import { useNavigate, useLocation } from 'react-router-dom';
import AttendanceEvent from '../../component/AttendanceEvent';
import { getEvent, getParticipation, getParticipationName } from '../../services/supabaseService';
import { FaCheck, FaQuestion, FaTimes } from 'react-icons/fa';

const characterImages = Array.from({ length: 10 }, (_, i) => require(`../../Img/characters/character${i + 1}.svg`));

const AttendanceEventListPage = () => {
    const navigate = useNavigate();
    const [eventData, setEventData] = useState(null);
    const [timeList, setTimeList] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [showAttendanceForm, setShowAttendanceForm] = useState(false);
    const [editingParticipant, setEditingParticipant] = useState(null); // 추가된 상태 변수
    const name = JSON.parse(sessionStorage.getItem('name'));
    const location = useLocation();
    const id = new URLSearchParams(location.search).get('eventId');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 이벤트 데이터를 가져오기
                const eventResponse = await getEvent(id);
                if (eventResponse && eventResponse.length > 0) {
                    const event = eventResponse[0];
                    setEventData(event);

                    if (event.time) {
                        const parsedTime = JSON.parse(event.time);
                        setTimeList(parsedTime);
                    }
                }

                // 참여자 목록을 가져오기
                const participationList = await getParticipation(id);
                if (participationList.length > 0) {
                    const parsedParticipationData = participationList.map(item => ({
                        name: item.name,
                        checked: JSON.parse(item.checked),
                        id: item.id, // participation_tb의 primary key
                    }));
                    setParticipants(parsedParticipationData);

                    const times = JSON.parse(participationList[0].time);
                    setTimeList(times);
                }

                // 이미 참여한 경우 리스트 페이지로 이동
                const participationResponse = await getParticipationName(id, name);
                if (participationResponse.data > 0) {
                    window.location.href = `${window.location.origin}/list?eventId=${encodeURIComponent(id)}`;
                }
            } catch (error) {
                console.error('Error fetching event data:', error);
            }
        };
        fetchData();
    }, [id, name]);

    const onEditClick = () => {
        navigate(`/edit?eventId=${encodeURIComponent(id)}`);
    };

    const formatDateString = (dateString) => {
        const [datePart, timePart] = dateString.split(' / ');
        const [month, dayWithWeekday] = datePart.split('월 ');
        const day = dayWithWeekday.replace('일', '');
        return (
            <span>
                <strong>{`${month}.${day}`}</strong> {timePart}
            </span>
        );
    };

    // 가장 가능성 높은 날짜를 저장할 변수
    let topDates = [];

    const getRowBackgroundColor = (rows) => {
        const rankedRows = rows.map(row => {
            const yesCount = row.statuses.filter(status => status.includes('yes')).length;
            const questionCount = row.statuses.filter(status => status.includes('question')).length;
            return { ...row, yesCount, questionCount };
        });

        const sortedCounts = [...rankedRows].sort((a, b) => {
            if (b.yesCount !== a.yesCount) {
                return b.yesCount - a.yesCount;
            } else {
                return b.questionCount - a.questionCount;
            }
        });

        const colorMapping = {};
        sortedCounts.forEach((row, index) => {
            if (index === 0) {
                colorMapping[row.time] = S.GreenBackground;
                topDates.push(row.time); // 가장 가능성 높은 날짜 추가
            } else if (index === 1) {
                colorMapping[row.time] = S.BlueBackground;
            } else {
                colorMapping[row.time] = null;
            }
        });

        return rows.map(row => ({
            ...row,
            backgroundColor: colorMapping[row.time]
        }));
    };

    const sortedTimeList = getRowBackgroundColor(
        timeList.map((time, timeIndex) => {
            const statuses = participants.map(participant => participant.checked[timeIndex]);
            return { time, statuses };
        })
    );

    // 참석자 수에 따른 툴팁 메시지 생성
    const participantCount = participants.length;
    let tooltipMessage = null;

    if (participantCount === 1) {
        tooltipMessage = <span>아직은 나 혼자뿐인가...</span>;
    } else if (participantCount === 2) {
        tooltipMessage = <span>오 친구가 생겼군!</span>;
    } else if (participantCount >= 3) {
        // 가장 가능성 높은 날짜 포맷팅
        const formattedDates = topDates.map(dateString => {
            const datePart = dateString.split(' / ')[0]; // 예: '5월 20일 (금)'
            const formattedDate = datePart.replace('월 ', '.').replace('일', '');
            return formattedDate;
        });

        tooltipMessage = (
            <span>
                가장 가능성 높은 날은{' '}
                {formattedDates.map((date, index) => (
                    <React.Fragment key={index}>
                        <span css={S.HighlightedDate}>{date}</span>
                        {index < formattedDates.length - 1 && ', '}
                    </React.Fragment>
                ))}이구만~!!!
            </span>
        );
    }

    const getRandomCharacterPlacements = () => {
        const placements = [];
        const usedPositions = new Set(); // 사용된 위치를 추적
        const usedCharacters = new Set(); // 사용된 캐릭터를 추적

        for (let i = 0; i < participants.length; i++) {
            let position;
            do {
                position = Math.floor(Math.random() * 5); // 0~4의 랜덤 위치를 선택
            } while (usedPositions.has(position));
            usedPositions.add(position);

            let characterIndex;
            do {
                characterIndex = Math.floor(Math.random() * characterImages.length);
            } while (usedCharacters.has(characterIndex));
            usedCharacters.add(characterIndex);

            const isFront = Math.random() < 0.5;  // 앞줄과 뒷줄에 랜덤으로 배치

            placements.push({
                position,
                character: characterImages[characterIndex],
                isFront,
                name: participants[i].name // 참석자 이름 추가
            });
        }

        return placements;
    };

    const characterPlacements = getRandomCharacterPlacements();

    // 참석자 수에 따른 열 너비 결정
    let participantColumnWidth;

    if (participantCount === 1) {
        participantColumnWidth = 380;
    } else if (participantCount === 2) {
        participantColumnWidth = 190;
    } else if (participantCount === 3) {
        participantColumnWidth = 126;
    } else if (participantCount >= 4) {
        participantColumnWidth = 95;
    } else {
        participantColumnWidth = 95; // 기본값
    }

    // 이름 클릭 시 호출되는 함수
    const handleParticipantNameClick = (participant) => {
        setEditingParticipant(participant);
        setShowAttendanceForm(true);
    };

    return (
        <div css={S.Layout}>
            <div css={S.Header}>
                <div css={S.HeaderBox}>
                    <div css={S.ImgBox}>
                        <img src={mainLogo} alt="Main Logo" />
                    </div>
                    <div css={S.HeaderItem}>
                        <h1>{eventData?.title}</h1>
                        <button onClick={onEditClick} style={{ display: 'flex', alignItems: 'center' }}>
                            <img
                                src={editLogo}
                                alt="모임 수정하기"
                                style={{ width: '20px', height: '20px', marginRight: '5px' }} // 아이콘 크기 및 간격
                            />
                            모임 수정하기
                        </button>
                    </div>
                    <h3>{eventData?.detail}</h3>
                </div>
            </div>

            {/* 참여자가 있을 때 리스트 컴포넌트 표시 */}
            {participants.length > 0 && (
                <div css={S.Component}>
                    {/* 툴팁 추가 */}
                    <div css={S.TooltipContainer}>
                        <div css={S.Tooltip}>
                            {tooltipMessage}
                        </div>
                    </div>

                    <div css={S.MainImgBox} style={{ marginTop: '294px', marginBottom: '134px' }}>
                        <div css={S.TableContainer}>
                            <img src={tableImage} alt="Table" css={S.TableImage} />
                            {characterPlacements.map((placement, index) => {
                                const leftPosition = 68 + placement.position * (104 + 16); // 첫 위치는 68px, 간격은 16px
                                const captionStyle = {
                                    position: 'absolute',
                                    left: `${leftPosition + 25}px`,
                                    width: 'auto',
                                    textAlign: 'left',
                                    marginTop: placement.isFront ? '60px' : '-330px', // 뒷줄은 위로, 앞줄은 아래로 배치
                                    fontSize: '16px', // 폰트 크기 조정
                                    fontWeight: 'bold', // 굵게 설정
                                };

                                return (
                                    <div key={index} style={{ position: 'relative' }}>
                                        <img
                                            src={placement.character}
                                            alt={`Character ${index + 1}`}
                                            css={placement.isFront ? S.FrontCharacter : S.BackCharacter}
                                            style={{ left: `${leftPosition}px`, position: 'absolute' }} // 캐릭터 위치
                                        />
                                        <div style={captionStyle}>
                                            {placement.name} {/* 참석자 이름 표시 */}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div css={S.AttendBox}>
                        <div css={S.TimeItem}>
                            <h3>모두의 빈타임</h3>
                            <span>일정을 수정하려면 참석자별 이름을 누르세요</span>
                        </div>
                        <div css={S.TableBox}>
                            <table css={S.Table}>
                                <thead>
                                    <tr css={S.ThItem(participantColumnWidth)}>
                                        <th>일정</th>
                                        {participants.map((participant, index) => (
                                            <th key={index}>
                                                <span
                                                    css={S.ParticipantName}
                                                    onClick={() => handleParticipantNameClick(participant)}
                                                >
                                                    {participant.name}
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                {sortedTimeList.map((row, index) => (
                                    <tr key={index} css={[S.TdItem(participantColumnWidth), row.backgroundColor]}>
                                        <td>{formatDateString(row.time)}</td>
                                        {participants.map((participant, pIndex) => {
                                            const status = participant.checked[index];
                                            return (
                                                <td key={pIndex}>
                                                    {status === `yes_${index}` && <FaCheck />}
                                                    {status === `question_${index}` && <FaQuestion />}
                                                    {status === `no_${index}` && <FaTimes />}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* 모임 참석하기 버튼은 showAttendanceForm이 false이고 editingParticipant가 null일 때만 표시 */}
                    {!showAttendanceForm && !editingParticipant && (
                        <button css={S.AttendButton} onClick={() => setShowAttendanceForm(true)}>
                            모임 참석하기
                        </button>
                    )}
                </div>
            )}

            {/* AttendanceEvent 컴포넌트는 showAttendanceForm이 true일 때만 표시 */}
            {showAttendanceForm && (
                <AttendanceEvent
                    eventData={eventData}
                    timeList={timeList}
                    existingParticipation={editingParticipant}
                    onClose={() => {
                        setShowAttendanceForm(false);
                        setEditingParticipant(null);
                    }}
                />
            )}
        </div>
    );

};

export default AttendanceEventListPage;