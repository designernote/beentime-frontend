import React, { useState, useEffect } from 'react';
/** @jsxImportSource @emotion/react */
import * as S from './Style';
import { FaCheck, FaQuestion, FaTimes } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import supabase from '../api/instance';

const AttendanceEvent = ({ timeList, eventData, existingParticipation, onClose }) => {
    const [selectedRadios, setSelectedRadios] = useState([]);
    const [attendeeName, setAttendeeName] = useState('');
    const location = useLocation();
    const id = new URLSearchParams(location.search).get('eventId');

    useEffect(() => {
        if (timeList && timeList.length > 0) {
            if (existingParticipation) {
                // 기존 참여 정보가 있는 경우 선택된 라디오 버튼을 설정
                setSelectedRadios(existingParticipation.checked);
                setAttendeeName(existingParticipation.name);
            } else {
                // 새로운 참여인 경우 초기화
                setSelectedRadios(new Array(timeList.length).fill(null));
            }
        }
    }, [timeList, existingParticipation]);

    const onChangeRadio = (e, index) => {
        const updatedRadios = [...selectedRadios];
        updatedRadios[index] = e.target.id;
        setSelectedRadios(updatedRadios);
    };

    const onNameChange = e => {
        setAttendeeName(e.target.value);
    };

    const onAttendClick = async () => {
        if (!attendeeName.trim()) {
            alert('이름을 입력해주세요.');
            return;
        }

        if (selectedRadios.includes(null)) {
            alert('모든 시간대에 대해 응답해주세요.');
            return;
        }

        try {
            if (existingParticipation) {
                // 기존 참여 정보 수정
                const { data: updateData, error: updateError } = await supabase
                    .from('participation_tb')
                    .update({
                        checked: selectedRadios,
                    })
                    .eq('id', existingParticipation.id);

                if (updateError) {
                    throw updateError;
                }

                if (updateData) {
                    sessionStorage.setItem('name', JSON.stringify(attendeeName));
                    alert('참여 정보가 수정되었습니다.');
                    if (onClose) onClose();
                    // 페이지 새로 고침 없이 상태 업데이트
                }
            } else {
                // 새로운 참여 추가
                const { data: participationList = [], error: participationError } = await supabase
                    .from('participation_tb')
                    .select('*')
                    .eq('event_id', id);

                if (participationError) {
                    throw participationError;
                }

                const isAlreadyAttended = participationList.some(participation => participation.name === attendeeName);

                if (isAlreadyAttended) {
                    sessionStorage.setItem('name', JSON.stringify(attendeeName));
                    alert('이미 참여 완료한 모임입니다.');
                    // 페이지 새로 고침
                    window.location.reload();
                } else {
                    const data = {
                        name: attendeeName,
                        time: timeList,
                        checked: selectedRadios,
                        event_id: eventData.event_id
                    };

                    const { data: responseData, error: responseError } = await supabase
                        .from('participation_tb')
                        .insert([data])
                        .select();

                    if (responseError) {
                        throw responseError;
                    }

                    if (responseData) {
                        sessionStorage.setItem('name', JSON.stringify(attendeeName));
                        alert('참여 완료 하였습니다.');
                        if (onClose) onClose();
                        // 페이지 새로 고침 없이 상태 업데이트
                    }
                }
            }
        } catch (error) {
            console.error('Error during participation:', error);
        }
    };

    return (
        <div css={S.Layout}>
            <div css={S.Component}>
                <div css={S.AttendBox}>
                    <div css={S.InputItem}>
                        <h3>이름을 알려줘!</h3>
                        <input
                            type="text"
                            placeholder="이름을 입력하세요"
                            value={attendeeName}
                            onChange={onNameChange}
                            disabled={!!existingParticipation} // 기존 참여자 이름은 수정 불가
                        />
                    </div>
                    <div css={S.TimeItem}>
                        <h3>나의 빈타임은?</h3>
                        <div css={S.TimeBox}>
                            {timeList?.map((date, index) => (
                                <div key={index} css={S.Times}>
                                    <h4>{date.split('/')[0]}</h4>
                                    <span>{date.split('/')[1]}</span>
                                    <div css={S.Btns}>
                                        <div css={S.Radio}>
                                            <input
                                                type="radio"
                                                id={`yes_${index}`}
                                                name={`check_${index}`}
                                                onChange={(e) => onChangeRadio(e, index)}
                                                checked={selectedRadios[index] === `yes_${index}`}
                                            />
                                            <label htmlFor={`yes_${index}`}><FaCheck /></label>
                                        </div>
                                        <div css={S.Radio}>
                                            <input
                                                type="radio"
                                                id={`question_${index}`}
                                                name={`check_${index}`}
                                                onChange={(e) => onChangeRadio(e, index)}
                                                checked={selectedRadios[index] === `question_${index}`}
                                            />
                                            <label htmlFor={`question_${index}`}><FaQuestion /></label>
                                        </div>
                                        <div css={S.Radio}>
                                            <input
                                                type="radio"
                                                id={`no_${index}`}
                                                name={`check_${index}`}
                                                onChange={(e) => onChangeRadio(e, index)}
                                                checked={selectedRadios[index] === `no_${index}`}
                                            />
                                            <label htmlFor={`no_${index}`}><FaTimes /></label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button css={S.BtnTrue} onClick={onAttendClick}>
                        {existingParticipation ? '참여 정보 수정하기' : '모임 참석하기'}
                    </button>
                    <button css={S.CancelButton} onClick={onClose}>취소</button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceEvent;