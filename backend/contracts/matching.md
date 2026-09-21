# matching.py — контракт 5: MatchResult

Граница: **Стас (matching) → фронт, econWrapper, simulation**.

## MatchFactor
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| name | str | да | Критерий ранжирования, напр. «грузоподъёмность», «проходимость» |
| weight | float | да | Вес критерия в итоговой формуле |
| contribution | float | да | Вклад фактора в итоговый score |
| note | str \| null | null | Пояснение к фактору |

## MatchCandidate
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| catalog_item_id | str | да | Ссылка на позицию каталога |
| status | MatchStatus | да | `recommended` / `needs_review` / `excluded` |
| score | float | да | Итоговая оценка, 0..1 |
| factors | list[MatchFactor] | [] | Explainable-разбивка score по факторам |
| reasons | list[str] | [] | Причины включения / исключения / необходимости проверки |
| quantity_if_selected | int \| null | null | Сколько единиц потребуется, если выбрать только этого кандидата |

## SelectedEquipment
| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| catalog_item_id | str | да | Ссылка на позицию каталога |
| quantity | int | да | Количество единиц (≥ 1) |

## MatchResult (корневая модель)
| Поле | Тип | Обязательное/по умолчанию | Описание |
|---|---|---|---|
| id | str | да | Идентификатор результата подбора |
| project_id | str | да | Идентификатор проекта |
| project_input_id | str | да | Ссылка на использованные входные параметры (ProjectInput) |
| generated_at | datetime | да | Момент генерации результата |
| candidates | list[MatchCandidate] | да | Все рассмотренные кандидаты с объяснением |
| selected_equipment | list[SelectedEquipment] | [] | Итоговый состав оборудования — вход для econWrapper и simulation |
| manual_additions | list[str] | [] | ID решений, добавленных вручную вне автоподбора |
